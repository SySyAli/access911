import json
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

class CallDataProcessor:
    """
    Process and analyze ElevenLabs call data
    """

    def __init__(self, data_dir: str = "webhook_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

    def export_to_csv(self, output_file: str = None) -> str:
        """
        Export all call data to CSV format
        """
        if output_file is None:
            output_file = f"call_summaries_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

        log_file = self.data_dir / "webhook_log.jsonl"
        if not log_file.exists():
            raise FileNotFoundError("No webhook data found")

        calls = []
        with open(log_file, "r") as f:
            for line in f:
                calls.append(json.loads(line.strip()))

        if not calls:
            raise ValueError("No call data to export")

        # Define CSV columns
        fieldnames = [
            "conversation_id",
            "timestamp",
            "event_type",
            "summary",
            "duration_seconds",
            "transcript_snippet",
            "speaker_count",
            "language"
        ]

        output_path = self.data_dir / output_file
        with open(output_path, "w", newline="", encoding="utf-8") as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for call in calls:
                # Extract transcript snippet (first 200 chars)
                transcript = call.get("transcript", "")
                transcript_snippet = transcript[:200] + "..." if len(transcript) > 200 else transcript

                row = {
                    "conversation_id": call.get("conversation_id", ""),
                    "timestamp": call.get("webhook_received_at", ""),
                    "event_type": call.get("event_type", ""),
                    "summary": call.get("summary", ""),
                    "duration_seconds": call.get("duration_seconds", ""),
                    "transcript_snippet": transcript_snippet,
                    "speaker_count": len(call.get("speakers", [])) if call.get("speakers") else "",
                    "language": call.get("language", "")
                }
                writer.writerow(row)

        print(f"📊 Exported {len(calls)} calls to {output_path}")
        return str(output_path)

    def get_call_stats(self) -> Dict[str, Any]:
        """
        Get basic statistics about received calls
        """
        log_file = self.data_dir / "webhook_log.jsonl"
        if not log_file.exists():
            return {"error": "No webhook data found"}

        calls = []
        with open(log_file, "r") as f:
            for line in f:
                calls.append(json.loads(line.strip()))

        if not calls:
            return {"error": "No call data available"}

        # Calculate stats
        total_calls = len(calls)
        total_duration = sum(call.get("duration_seconds", 0) for call in calls if call.get("duration_seconds"))
        avg_duration = total_duration / total_calls if total_calls > 0 else 0

        # Count event types
        event_types = {}
        for call in calls:
            event_type = call.get("event_type", "unknown")
            event_types[event_type] = event_types.get(event_type, 0) + 1

        # Get date range
        timestamps = [call.get("webhook_received_at") for call in calls if call.get("webhook_received_at")]
        if timestamps:
            first_call = min(timestamps)
            last_call = max(timestamps)
        else:
            first_call = last_call = "N/A"

        return {
            "total_calls": total_calls,
            "total_duration_seconds": total_duration,
            "average_duration_seconds": round(avg_duration, 2),
            "event_types": event_types,
            "date_range": {
                "first_call": first_call,
                "last_call": last_call
            }
        }

    def search_calls(self, query: str) -> List[Dict[str, Any]]:
        """
        Search calls by summary or transcript content
        """
        log_file = self.data_dir / "webhook_log.jsonl"
        if not log_file.exists():
            return []

        matching_calls = []
        query_lower = query.lower()

        with open(log_file, "r") as f:
            for line in f:
                call = json.loads(line.strip())

                # Search in summary and transcript
                summary = call.get("summary", "").lower()
                transcript = call.get("transcript", "").lower()

                if query_lower in summary or query_lower in transcript:
                    matching_calls.append({
                        "conversation_id": call.get("conversation_id"),
                        "timestamp": call.get("webhook_received_at"),
                        "summary": call.get("summary"),
                        "relevance_score": summary.count(query_lower) + transcript.count(query_lower)
                    })

        # Sort by relevance
        matching_calls.sort(key=lambda x: x["relevance_score"], reverse=True)
        return matching_calls

if __name__ == "__main__":
    processor = CallDataProcessor()

    # Print stats
    stats = processor.get_call_stats()
    print("📈 Call Statistics:")
    print(json.dumps(stats, indent=2))

    # Export to CSV
    try:
        csv_file = processor.export_to_csv()
        print(f"✅ Data exported to: {csv_file}")
    except (FileNotFoundError, ValueError) as e:
        print(f"ℹ️  {e}")