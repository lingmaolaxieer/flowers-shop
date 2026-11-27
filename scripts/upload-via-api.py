#!/usr/bin/env python3
"""通过 GitHub Git Data API 上传本仓库全部文件（git push 不可用时的兜底路径）。

适用场景：网络代理拦截 github.com 主域名（CONNECT tunnel 502），
但 api.github.com 可达。本脚本只用 api.github.com，不访问 github.com。

用法：
    GITHUB_TOKEN=ghp_xxxxxxxx python3 scripts/upload-via-api.py

前提：仓库 lingmaolaxieer/flowers-shop 已存在（可为空仓库），
      token 具备 repo 权限。
"""
import base64
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

OWNER = "lingmaolaxieer"
REPO = "flowers-shop"
API = "https://api.github.com"
BASE = f"{API}/repos/{OWNER}/{REPO}"
TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
WORKERS = 4
RETRIES = 3

if not TOKEN:
    sys.exit("错误：请设置环境变量 GITHUB_TOKEN（具备 repo 权限的 PAT）")


def api(method, path, payload=None):
    """调用 GitHub REST API，返回 (status, parsed_json_or_text)。带简单重试。"""
    url = path if path.startswith("http") else BASE + path
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    last_err = None
    for attempt in range(RETRIES):
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bearer {TOKEN}")
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("X-GitHub-Api-Version", "2022-11-28")
        req.add_header("Content-Type", "application/json")
        req.add_header("User-Agent", "flowers-shop-uploader")
        try:
            with urllib.request.urlopen(req, timeout=40) as resp:
                raw = resp.read().decode("utf-8")
                return resp.status, (json.loads(raw) if raw.strip() else {})
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            # 4xx（除 429）不重试，直接报错
            if e.code < 500 and e.code not in (429,):
                sys.exit(f"API {method} {path} 失败 HTTP {e.code}: {body[:600]}")
            last_err = f"HTTP {e.code}: {body[:300]}"
        except Exception as e:  # 网络抖动 / 代理 502
            last_err = repr(e)
        time.sleep(1.5 * (attempt + 1))
    sys.exit(f"API {method} {path} 重试 {RETRIES} 次仍失败: {last_err}")


def git(*args):
    return subprocess.check_output(["git", *args], cwd=os.getcwd())


def list_tracked_files():
    """返回 [(mode, blob_sha, path)]，只包含 HEAD 中已跟踪的文件。"""
    out = git("ls-tree", "-r", "HEAD").decode("utf-8")
    items = []
    for line in out.splitlines():
        meta, path = line.split("\t", 1)
        mode, obj_type, sha = meta.split()
        if obj_type == "blob":
            items.append((mode, sha, path))
    return items


def upload_blob(item):
    mode, sha, path = item
    content = git("cat-file", "blob", sha)
    status, body = api(
        "POST",
        "/git/blobs",
        {"content": base64.b64encode(content).decode("ascii"), "encoding": "base64"},
    )
    return path, mode, body["sha"]


def main():
    print(f"目标仓库: {OWNER}/{REPO}")
    status, who = api("GET", f"{API}/user")
    print(f"认证用户: {who.get('login')}")

    # 远端是否已有 main 分支（决定 commit 的 parent）
    parent_sha = None
    req = urllib.request.Request(f"{BASE}/git/ref/heads/main")
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            parent_sha = json.loads(resp.read().decode("utf-8"))["object"]["sha"]
            print(f"远端已有 main: {parent_sha[:8]}，将作为 parent")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print("远端为空仓库，将创建首个提交")
        else:
            print(f"警告：查询远端 ref 返回 {e.code}，按空仓库处理")

    files = list_tracked_files()
    print(f"待上传文件: {len(files)} 个")

    tree_entries = []
    done = 0
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futures = {pool.submit(upload_blob, f): f[2] for f in files}
        for fut in as_completed(futures):
            path, mode, blob_sha = fut.result()
            tree_entries.append({"path": path, "mode": mode, "type": "blob", "sha": blob_sha})
            done += 1
            if done % 50 == 0 or done == len(files):
                print(f"  blob 进度 {done}/{len(files)}")

    tree_entries.sort(key=lambda x: x["path"])
    status, tree = api("POST", "/git/trees", {"tree": tree_entries})
    print(f"tree 已创建: {tree['sha'][:8]} ({len(tree_entries)} 项)")

    commit_payload = {
        "message": (
            "feat: 鲜花批发零售系统 M0-M9 全量实现\n\n"
            "- 后端 NestJS: 18 模块 / 152 接口 / 73 实体 + 8 组迁移\n"
            "- Vue3 管理端(13 页) + 微信原生小程序(12 页) + shared 契约包\n"
            "- 文档: 使用规范/功能清单/部署/二开/上线清单/操作步骤/HANDOFF 交接摘要\n"
            "- 本地 SQLite 演示模式已实测启动并通过端到端冒烟测试"
        ),
        "tree": tree["sha"],
        "parents": [parent_sha] if parent_sha else [],
        "author": {
            "name": "WorkBuddy Agent",
            "email": "agent@workbuddy.local",
            "date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        },
    }
    status, commit = api("POST", "/git/commits", commit_payload)
    print(f"commit 已创建: {commit['sha'][:8]}")

    if parent_sha:
        api("PATCH", "/git/refs/heads/main", {"sha": commit["sha"], "force": False})
    else:
        api("POST", "/git/refs", {"ref": "refs/heads/main", "sha": commit["sha"]})
    print("main 分支已更新")

    status, verify = api("GET", "/git/ref/heads/main")
    print(f"验证: refs/heads/main -> {verify['object']['sha'][:8]}")
    print(f"完成: https://github.com/{OWNER}/{REPO}")


if __name__ == "__main__":
    main()
