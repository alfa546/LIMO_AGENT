import asyncio
import uuid
from datetime import datetime, timedelta


class ReminderScheduler:
    """Simple in-memory async reminder scheduler for bot tasks."""

    def __init__(self):
        self.jobs = {}

    def schedule_in_minutes(self, minutes: int, callback):
        run_at = datetime.utcnow() + timedelta(minutes=minutes)
        return self.schedule_at(run_at, callback)

    def schedule_at(self, run_at: datetime, callback):
        job_id = str(uuid.uuid4())

        async def _job_runner():
            delay = (run_at - datetime.utcnow()).total_seconds()
            if delay > 0:
                await asyncio.sleep(delay)

            try:
                await callback()
            finally:
                self.jobs.pop(job_id, None)

        task = asyncio.create_task(_job_runner())
        self.jobs[job_id] = {
            "task": task,
            "run_at": run_at,
        }
        return job_id

    def cancel(self, job_id: str) -> bool:
        job = self.jobs.pop(job_id, None)
        if not job:
            return False

        task = job.get("task")
        if task and not task.done():
            task.cancel()
        return True

    def list_jobs(self):
        result = []
        for job_id, job in self.jobs.items():
            task = job.get("task")
            if task and task.done():
                continue
            result.append(
                {
                    "id": job_id,
                    "run_at": job.get("run_at"),
                }
            )
        return result
