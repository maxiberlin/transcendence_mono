from functools import wraps
from typing import Callable, Any, TypeAlias, TypedDict, Awaitable, Union
from abc import ABC
from .chat_types import ChatCommands
from user.models import UserAccount
from .base_types import CommandResponse, BaseCommand, BaseEvent, ChannelsEvent
import inspect
from functools import wraps
import asyncio
from channels.layers import get_channel_layer
from channels_redis.core import RedisChannelLayer

# def command(command_name: str) -> Callable[[Callable], Callable]:
#     def method_decorator(method: Callable[[Any], CommandResponse]) -> Callable:
#         @wraps(method)
#         async def wrapper(*args, **kwargs) -> CommandResponse:
#             return method(*args, **kwargs)
        
#         # Hinzufügen der Metadaten zur Methode
#         setattr(wrapper, "_command_name", command_name)
#         # wrapper._command_name = command_name
#         return wrapper
#     return method_decorator

# CommandHandlerAsync: TypeAlias = Callable[[BaseCommand], Awaitable[CommandResponse]]
CommandHandlerAsync: TypeAlias = Callable[..., Awaitable[CommandResponse]]

def command(command_name: str) -> Callable[[CommandHandlerAsync], CommandHandlerAsync]:
    def method_decorator(method: CommandHandlerAsync) -> CommandHandlerAsync:

        @wraps(method)
        async def async_wrapper(*args, **kwargs) -> CommandResponse:
            return await method(*args, **kwargs)
        
        setattr(async_wrapper, "_command_name", command_name)
        return async_wrapper

    return method_decorator



def event(event_name: str) -> Callable[[Callable], Callable]:
    def method_decorator(method: Callable[[Any], BaseEvent]) -> Any:
        @wraps(method)
        def wrapper(*args, **kwargs) -> BaseEvent:
            return method(*args, **kwargs)
        
        # Hinzufügen der Metadaten zur Methode
        setattr(wrapper, "_event_name", event_name)
        # wrapper._command_name = command_name
        return wrapper
    return method_decorator

class BaseHandler:
    def __init__(self, user: UserAccount):
        self.user = user
        self._commands: dict = {}
        self._events: dict = {}
        self._bind_handler()
        
    async def on_connect(self):
        self.channel_layer: RedisChannelLayer | None = get_channel_layer()

        
    def get_cmd_res(self, cmd: BaseCommand, success: bool, payload) -> CommandResponse:
        return {
            "command": cmd["command"],
            "module": cmd["module"],
            "success": success,
            "payload": payload
        }

    def _bind_handler(self):
        for name, method in self.__class__.__dict__.items():
            if callable(method) and hasattr(method, '_command_name'):
                self._commands[method._command_name] = method
            if callable(method) and hasattr(method, '_event_name'):
                self._commands[method._event_name] = method

    async def execute_command(self, command: ChatCommands, **kwargs) -> CommandResponse:
        print(self._commands)
        command_name = command.get("command")
        if isinstance(command_name, str) and command_name in self._commands:
            method = self._commands[command_name]
            return method(self, **kwargs)
        else:
            raise ValueError(f"Command '{command_name}' not found")
        
    async def push_to_user(self):
        pass

    async def push_to_group(self, group_name: str, data: BaseEvent):
        if not self.channel_layer:
            raise RuntimeError("NO CHANNEL LAYER INSTALLED")
        event: ChannelsEvent = {
            "type": "handle_event",
            "data": data
        }
        await self.channel_layer.group_send(group_name, event)


# async def dispatch_


# class BaseHandler:
    

#     def __init__(self) -> None:
#         self.__registered_commands: dict[str, str] = {}
#     # def __init__(self, user: UserAccount) -> None:
#     #     self.user = user
        
#     def register_command(self, command: str, handler_name: str):
#         if not hasattr(self.__registered_commands, command):
#             if not hasattr(self, handler_name):
#                 raise RuntimeError("register_command: handler name in not defined")
#             self.__registered_commands[command] = handler_name
    
#     def dispatch_event(self, command: ChatCommands):
#         print("dispatch?")
#         print(self.__registered_commands)
#         func_name = self.__registered_commands.get(command["command"], None)
#         if func_name is not None:
#             if not hasattr(self, func_name):
#                 raise RuntimeError("dispatch_event: handler name in not defined")
#             func = getattr(self, func_name)
#             if not callable(func):
#                 raise RuntimeError("dispatch_event: is not callable")
#             func(command)
        

# def command(command: str) -> Callable[[Callable], Callable]:
#     print("dec 1, cmd: ", command)
#     def wrapper(func: Callable[[Any], CommandResponse]) -> Any:
#         print("dec 2")
#         # print("dec cls", cls)
#         print(func)
#         print(type(func))
#         # print(func.__self__.__class__)
#         if inspect.ismethod(func):
#             print("is method!")
#             print(func.__class__)
#         else:
#             print("is NO method!")
#         def inner(*args, **kwargs) -> CommandResponse:
#             print("dec 3")
#             print(kwargs)
#             # if len(args) > 0 and isinstance(args[0], BaseHandler):
#             #     base_class = type(args[0])
#             #     base_class.register_command(command)
#             return func(*args, **kwargs)
#         return inner
#     return wrapper


