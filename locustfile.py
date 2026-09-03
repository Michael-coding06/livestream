import random
import string
from locust import FastHttpUser, task, between, events
from flask import jsonify

TYPES = ["comment", "gift", "like", "system"]
SAMPLE_COMMENTS = [
    "Hello everyone! 👋",
    "Great stream!",
    "POG 🔥",
    "What song is this?",
    "GG!",
    "Love from local!",
    "LMAO 🤣🤣",
]

def generate_random_string(prefix="user_"):
    return prefix + "".join(random.choices(string.ascii_lowercase + string.digits, k=6))

class StreamFloodUser(FastHttpUser):
    # High-performance pacing (10ms to 50ms pause per user)
    wait_time = between(0.01, 0.05)

    def on_start(self):
        """Executes when each virtual user spawns: creates a room first."""
        self.username = generate_random_string("user_")
        self.host_name = generate_random_string("host_")
        self.room_id = 1  # Default fallback ID

        room_payload = {
            "name": f"{self.host_name}'s Stream Room",
            "host": self.host_name
        }

        try:
            response = self.client.post(
                "/room/create",
                json=room_payload,
                headers={"Content-Type": "application/json"}
            )
            if response.status_code in (200, 201):
                data = response.json()
                self.room_id = data.get("room_id") or data.get("id") or random.randint(1, 1000)
        except Exception:
            pass

    @task
    def create_comment(self):
        """Floods comments using the assigned room_id."""
        event_type = random.choice(TYPES)
        payload = {
            "room_id": getattr(self, "room_id", 1),
            "user_id": random.randint(10000, 999999),
            "type": event_type,
            "gift_value": random.choice([0, 10, 50, 100, 500]) if event_type == "gift" else 0,
            "content": random.choice(SAMPLE_COMMENTS),
            "username": self.username
        }

        self.client.post(
            "/comment/create",
            json=payload,
            headers={"Content-Type": "application/json"}
        )

# ------------------------------------------------------------------
# Request Failure Console Logger (Explicit ms output)
# ------------------------------------------------------------------
@events.request.add_listener
def log_request_failure(request_type, name, response_time, response_length, exception, **kwargs):
    if exception:
        print(f"❌ {name} failed after {response_time:.2f} ms: {exception}")

# ------------------------------------------------------------------
# Persistent Web UI Button Injection (Visible during Spawning/Cleanup)
# ------------------------------------------------------------------
@events.init.add_listener
def setup_custom_web_ui(environment, **kwargs):
    if environment.web_ui:
        # Backend handler for custom button clicks
        @environment.web_ui.app.route("/api/custom-trigger", methods=["POST"])
        def custom_trigger():
            print("⚡ Custom action executed from Web UI header!")
            return jsonify({"status": "ok", "message": "Action triggered successfully!"})

        # Inject persistent UI button into all Locust Web HTML pages
        @environment.web_ui.app.after_request
        def inject_persistent_button(response):
            if response.content_type and "text/html" in response.content_type:
                button_script = """
                <script>
                (function injectButton() {
                    function addBtn() {
                        if (document.getElementById('custom-header-btn')) return;
                        var targetContainer = document.querySelector('.top-bar') || document.querySelector('header') || document.body;
                        if (targetContainer) {
                            var btn = document.createElement('button');
                            btn.id = 'custom-header-btn';
                            btn.innerHTML = '⚡ Custom Action';
                            btn.style.cssText = 'background-color:#9b59b6; color:white; border:none; padding:6px 14px; margin:8px; border-radius:4px; cursor:pointer; font-weight:bold; position:fixed; top:0; right:200px; z-index:99999;';
                            btn.onclick = function() {
                                fetch('/api/custom-trigger', {method: 'POST'})
                                    .then(r => r.json())
                                    .then(data => alert(data.message));
                            };
                            document.body.appendChild(btn);
                        }
                    }
                    if (document.readyState === 'complete') { addBtn(); }
                    else { window.addEventListener('load', addBtn); }
                })();
                </script>
                """
                html_content = response.get_data(as_text=True)
                response.set_data(html_content.replace("</body>", button_script + "</body>"))
            return response