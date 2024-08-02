from functools import wraps

def register_command(command_name):
    def method_decorator(method):
        @wraps(method)
        def wrapper(*args, **kwargs):
            return method(*args, **kwargs)
        
        # Hinzufügen der Metadaten zur Methode
        setattr(wrapper, "_command_name", command_name)
        # wrapper._command_name = command_name
        return wrapper
    return method_decorator

class BaseHandler:
    def __init__(self, namespace):
        self._namespace = namespace
        self._commands = {}
        self._bind_commands()

    def _bind_commands(self):
        for name, method in self.__class__.__dict__.items():
            if callable(method) and hasattr(method, '_command_name'):
                command_name = method._command_name
                self._commands[command_name] = method

    def execute_command(self, command, **kwargs):
        if command in self._commands:
            method = self._commands[command]
            return method(self, **kwargs)
        else:
            raise ValueError(f"Command '{command}' not found in namespace '{self._namespace}'")

class ChatHandler(BaseHandler):
    def __init__(self):
        super().__init__("chat")

    @register_command("get_chat_conversations")
    def get_chat_conversations(self, page):
        print(f"Fetching chat conversations for page {page}")
        return f"Conversations on page {page}"

    @register_command("send_message")
    def send_message(self, message):
        print(f"Sending message: {message}")
        return f"Message sent: {message}"

class NotificationHandler(BaseHandler):
    def __init__(self):
        super().__init__("notification")

    @register_command("get_notifications")
    def get_notifications(self, user_id):
        print(f"Fetching notifications for user {user_id}")
        return f"Notifications for user {user_id}"

    @register_command("mark_as_read")
    def mark_as_read(self, notification_id):
        print(f"Marking notification {notification_id} as read")
        return f"Notification {notification_id} marked as read"

# Erstellen des Dictionaries mit den Handler-Instanzen
handlers = {
    "chat": ChatHandler(),
    "notification": NotificationHandler()
}

# Funktion zum Dispatchen des Events
def dispatch_event(namespace, command, **kwargs):
    if namespace in handlers:
        handler = handlers[namespace]
        return handler.execute_command(command, **kwargs)
    else:
        raise ValueError(f"Namespace '{namespace}' not found")

# Beispielnutzung
event = {
    "module": "chat",
    "command": "get_chat_conversations",
    "page": 1
}

result = dispatch_event(event["module"], event["command"], page=event["page"])
print(result)

event = {
    "module": "notification",
    "command": "get_notifications",
    "user_id": 42
}

result = dispatch_event(event["module"], event["command"], user_id=event["user_id"])
print(result)
