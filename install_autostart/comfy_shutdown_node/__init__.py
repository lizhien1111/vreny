"""ComfyUI extension: POST /shutdown, POST /clean_output."""
import os
import signal
import threading
import shutil
from pathlib import Path

try:
    from server import PromptServer
    from aiohttp import web
    import folder_paths
except Exception:
    PromptServer = None


def _kill_soon():
    def _do():
        try:
            os.kill(os.getpid(), signal.SIGTERM)
        except Exception:
            os._exit(0)

    threading.Timer(0.4, _do).start()


def _rm_tree_contents(dir_path: Path):
    removed = 0
    bytes_freed = 0
    if not dir_path.is_dir():
        return removed, bytes_freed
    for p in dir_path.iterdir():
        try:
            if p.is_file() or p.is_symlink():
                sz = p.stat().st_size if p.is_file() else 0
                p.unlink(missing_ok=True)
                removed += 1
                bytes_freed += sz
            elif p.is_dir():
                # measure size roughly
                for root, dirs, files in os.walk(p):
                    for f in files:
                        fp = Path(root) / f
                        try:
                            bytes_freed += fp.stat().st_size
                            removed += 1
                        except Exception:
                            pass
                shutil.rmtree(p, ignore_errors=True)
        except Exception:
            pass
    return removed, bytes_freed


if PromptServer is not None:
    routes = PromptServer.instance.routes

    @routes.post("/shutdown")
    async def shutdown_handler(request):
        _kill_soon()
        return web.json_response({"status": "shutting_down"})

    @routes.post("/poweroff_instance")
    async def poweroff_instance_handler(request):
        """Power off the whole AutoDL instance (stops billing for GPU)."""
        def _do():
            try:
                os.system("/usr/bin/shutdown")
            except Exception:
                pass
            try:
                os.system("shutdown -h now")
            except Exception:
                os._exit(0)

        threading.Timer(0.8, _do).start()
        return web.json_response({"status": "powering_off"})

    @routes.post("/clean_output")
    async def clean_output_handler(request):
        """Delete files under Comfy output/ and temp/ (not models)."""
        try:
            body = await request.json()
        except Exception:
            body = {}
        clear_output = body.get("output", True)
        clear_temp = body.get("temp", True)
        out_dir = Path(folder_paths.get_output_directory())
        temp_dir = Path(folder_paths.get_temp_directory())
        report = {"output_dir": str(out_dir), "temp_dir": str(temp_dir)}
        total_n = 0
        total_b = 0
        if clear_output:
            n, b = _rm_tree_contents(out_dir)
            report["output_removed"] = n
            report["output_bytes"] = b
            total_n += n
            total_b += b
        if clear_temp:
            n, b = _rm_tree_contents(temp_dir)
            report["temp_removed"] = n
            report["temp_bytes"] = b
            total_n += n
            total_b += b
        report["removed"] = total_n
        report["bytes"] = total_b
        report["status"] = "ok"
        return web.json_response(report)

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
