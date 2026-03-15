import json
import asyncio
import aiohttp
import time
import sys
from typing import Dict, Any, List

CONVERSATION_URL = "http://localhost:8001/api/conversations"
TASKS_URL = "http://localhost:8001/api/tasks"

async def run_single_test(session: aiohttp.ClientSession, test_case: Dict[str, Any]) -> Dict[str, Any]:
    """Run one test case: create conv → send message → poll for result."""
    tc_id = test_case['id']

    # 1. Create Conversation
    try:
        async with session.post(CONVERSATION_URL, json={"title": tc_id}) as resp:
            if resp.status not in (200, 201, 202):
                return {"id": tc_id, "status": "failed", "error": f"Conv create: HTTP {resp.status}"}
            conv_data = await resp.json()
            conv_id = conv_data["conversation_id"]
    except Exception as e:
        return {"id": tc_id, "status": "failed", "error": f"Conv error: {e}"}

    prompt = test_case.get("input", test_case.get("input_1", ""))
    if not prompt:
        return {"id": tc_id, "status": "skipped", "error": "No input"}

    # 2. Send Message
    t0 = time.time()
    try:
        url = f"{CONVERSATION_URL}/{conv_id}/messages"
        async with session.post(url, json={"message": prompt}) as resp:
            if resp.status not in (200, 201, 202):
                return {"id": tc_id, "status": "failed", "error": f"Msg send: HTTP {resp.status}"}
            msg_data = await resp.json()
            task_id = msg_data.get("task_id")
            if not task_id:
                dur = time.time() - t0
                return {"id": tc_id, "status": "passed", "time": dur, "note": "fast-path"}
    except Exception as e:
        return {"id": tc_id, "status": "failed", "error": f"Msg error: {e}"}

    # 3. Poll for completion (max 90s)
    for _ in range(90):
        try:
            async with session.get(f"{TASKS_URL}/{task_id}") as resp:
                if resp.status == 200:
                    td = await resp.json()
                    st = td.get("status")
                    if st in ("completed", "failed", "cancelled", "awaiting_approval"):
                        dur = time.time() - t0
                        results = td.get("results", [])
                        result_str = json.dumps(results).lower()
                        expected = str(test_case.get("expected_result", "")).lower()
                        passed = True
                        err = ""
                        if st == "failed":
                            passed = False
                            err = f"Task failed: {td.get('error')}"
                        elif expected and expected not in result_str:
                            passed = False
                            err = f"Expected '{expected}' not in results"
                        return {
                            "id": tc_id,
                            "status": "passed" if passed else "failed",
                            "task_status": st,
                            "time": dur,
                            "error": err,
                        }
        except Exception:
            pass
        await asyncio.sleep(1)

    return {"id": tc_id, "status": "failed", "error": "Timeout 90s"}


async def main():
    files = ["awe_test_cases.json", "awe_deep_tests.json"]

    # Collect all tests
    all_tests = []
    for fn in files:
        try:
            data = json.load(open(fn, "r", encoding="utf-8"))
            for suite in data.get("test_suites", []):
                for test in suite.get("tests", []):
                    all_tests.append(test)
        except Exception as e:
            print(f"Could not load {fn}: {e}")

    total = len(all_tests)
    print(f"Total tests: {total}")
    print(f"Throttle: 30 req/min (1 test every 2s)")
    print(f"Estimated time: ~{total * 2 // 60} minutes\n")

    all_results = []
    passed = failed = skipped = 0

    timeout = aiohttp.ClientTimeout(total=120)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        for i, test in enumerate(all_tests):
            result = await run_single_test(session, test)
            all_results.append(result)

            s = result["status"]
            if s == "passed":
                passed += 1
                print(f"[{i+1}/{total}] ✅ {result['id']} ({result.get('time', 0):.1f}s)")
            elif s == "skipped":
                skipped += 1
                print(f"[{i+1}/{total}] ⏭️  {result['id']} (skipped)")
            else:
                failed += 1
                print(f"[{i+1}/{total}] ❌ {result['id']} — {result.get('error', '')[:80]}")

            # Throttle: wait 2s between tests (30 req/min)
            if i < total - 1:
                await asyncio.sleep(2)

            # Progress every 50
            if (i + 1) % 50 == 0:
                print(f"\n--- Progress: {i+1}/{total} | ✅{passed} ❌{failed} ⏭️{skipped} ---\n")

    print(f"\n{'='*50}")
    print(f"FINAL: {total} tests")
    print(f"  ✅ PASSED:  {passed}")
    print(f"  ❌ FAILED:  {failed}")
    print(f"  ⏭️  SKIPPED: {skipped}")
    print(f"{'='*50}")

    with open("qa_final_results.json", "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)
    print("Saved to qa_final_results.json")

if __name__ == "__main__":
    asyncio.run(main())
