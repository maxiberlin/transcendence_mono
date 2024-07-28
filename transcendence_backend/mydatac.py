# import json
# from dataclasses import dataclass, field, fields, is_dataclass
# from typing import Type, Dict, Any, List, Union, TypeAlias

# # Definition der JSON-kompatiblen Typen
# JSONValue: TypeAlias = Union[int, float, str, bool, None, "JSONArray", "JSONObject"]
# JSONArray: TypeAlias = List[JSONValue]
# JSONObject: TypeAlias = Dict[str, JSONValue]

# def validate(self):
#     if not is_dataclass(self):
#         raise TypeError(f"Expected dataclass instance, got {type(self).__name__}")

#     for field_info in fields(self):
#         field_name = field_info.name
#         field_type = field_info.type
#         value = getattr(self, field_name)

#         # Prüfen, ob der Typ JSON-kompatibel ist
#         if get_origin(field_type) is Union:
#             if not any(isinstance(value, arg) for arg in get_args(field_type)):
#                 raise TypeError(f"Field '{field_name}' should be of type '{field_type}', got '{type(value).__name__}'")
#         elif isinstance(value, (int, float, str, bool, type(None), list, dict)):
#             if isinstance(value, list):
#                 for item in value:
#                     if not isinstance(item, (int, float, str, bool, type(None), list, dict)):
#                         raise TypeError(f"Items in the list for field '{field_name}' must be JSON-compatible types")
#             elif isinstance(value, dict):
#                 for key, item in value.items():
#                     if not isinstance(key, str):
#                         raise TypeError(f"Keys in the dict for field '{field_name}' must be str")
#                     if not isinstance(item, (int, float, str, bool, type(None), list, dict)):
#                         raise TypeError(f"Values in the dict for field '{field_name}' must be JSON-compatible types")
#         elif is_dataclass(field_type):
#             if not isinstance(value, field_type):
#                 raise TypeError(f"Field '{field_name}' should be of type '{field_type.__name__}', got '{type(value).__name__}'")
#             validate_instance(value)
#         else:
#             raise TypeError(f"Field '{field_name}' must be a JSON-compatible type or a validated dataclass, got '{type(value).__name__}'")

# def validated_dataclass(cls: Type[Any]) -> Type[Any]:
#     cls = dataclass(cls)
#     setattr(cls, 'validate', validate)
#     return cls

# def create_dataclass_instance(dataclass_type: Type[Any], data: Dict[str, Any]) -> Any:
#     """Erstellt eine Instanz einer `dataclass` aus einem `dict`, rekursiv für geschachtelte `dataclasses`."""
#     allowed_fields = {f.name for f in fields(dataclass_type)}
#     filtered_data = {k: v for k, v in data.items() if k in allowed_fields}

#     for field_name, field_value in filtered_data.items():
#         field_type = next(f.type for f in fields(dataclass_type) if f.name == field_name)
#         if is_dataclass(field_type):
#             filtered_data[field_name] = create_dataclass_instance(field_type, field_value)

#     instance = dataclass_type(**filtered_data)
#     validate_instance(instance)
#     return instance

# def validate_instance(instance: Any):
#     """Überprüft, ob die Instanz die `validate`-Methode hat und ruft sie auf."""
#     if hasattr(instance, 'validate') and callable(getattr(instance, 'validate')):
#         instance.validate()

# # Beispiel für eine geschachtelte Dataclass
# @validated_dataclass
# class NestedData:
#     nested_field: int

# @validated_dataclass
# class ExampleData:
#     number: int
#     nested_data: NestedData

# # Testen der Funktion zur Erstellung von `dataclass`-Instanzen
# example_json = '{"number": 42, "nested_data": {"nested_field": 100}}'
# example_data = create_dataclass_instance(ExampleData, json.loads(example_json))
# print(example_data)

# # Testen mit nicht JSON-kompatiblen Typen sollte einen Fehler auslösen
# @validated_dataclass
# class InvalidData:
#     invalid_field: complex  # complex ist kein JSON-kompatibler Typ

# try:
#     invalid_json = '{"invalid_field": "(1+2j)"}'
#     invalid_data = create_dataclass_instance(InvalidData, json.loads(invalid_json))
#     print(invalid_data)
# except TypeError as e:
#     print(f"Validation error: {e}")



import json
from dataclasses import dataclass, fields, is_dataclass
from typing import Type, Any, Dict, Union, List, get_type_hints, TypeVar

T = TypeVar('T', bound='JSONSerializable')

class JSONSerializable:
    @classmethod
    def from_json(cls: Type[T], json_data: Union[str, Dict]) -> T:
        if isinstance(json_data, str):
            json_data = json.loads(json_data)
        if not isinstance(json_data, dict):
            raise ValueError("Invalid JSON data")
        
        field_values = {}
        for field in fields(cls):
            if field.name in json_data:
                value = json_data[field.name]
                field_type = field.type
                if is_dataclass(field_type):
                    field_values[field.name] = field_type.from_json(value)
                else:
                    field_values[field.name] = value
        
        return cls(**field_values)
    
    @staticmethod
    def is_valid_type(value: Any, expected_type: Type) -> bool:
        origin = getattr(expected_type, '__origin__', None)
        if origin is Union:
            return any(isinstance(value, t) for t in expected_type.__args__)
        if origin is list:
            return all(isinstance(i, expected_type.__args__[0]) for i in value)
        return isinstance(value, expected_type)

def validated_dataclass(cls: Type[T]) -> Type[T]:
    cls = dataclass(cls)  # Erstellt die Dataclass
    
    # Original-Init-Funktion sichern
    original_init = cls.__init__
    
    def __init__(self, *args, **kwargs):
        annotations = get_type_hints(cls)
        for field_name, field_type in annotations.items():
            if field_name in kwargs:
                value = kwargs[field_name]
                if not isinstance(value, field_type) and not JSONSerializable.is_valid_type(value, field_type):
                    raise TypeError(f"Field {field_name} is expected to be of type {field_type} but got {type(value)}")
        original_init(self, *args, **kwargs)
    
    cls.__init__ = __init__
    cls.from_json = classmethod(JSONSerializable.from_json)
    return cls

# Beispiel für die Verwendung

@validated_dataclass
class NestedData(JSONSerializable):
    nested_field: int

@validated_dataclass
class ExampleData(JSONSerializable):
    number: int
    nested_data: NestedData

# JSON-Daten
json_data = '''
{
    "number": 42,
    "nested_data": {
        "nested_field": 7
    }
}
'''

# Erstellen eines ExampleData-Objekts aus JSON
example = ExampleData.from_json(json_data)
print(example)  # Ausgabe: ExampleData(number=42, nested_data=NestedData(nested_field=7))
