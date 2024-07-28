from .models import FriendRequest
from notification.models import Notification
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericRelation
from django.contrib.contenttypes.fields import create_generic_related_manager
from django.contrib.contenttypes.fields import ReverseGenericManyToOneDescriptor

def run():
    q = ContentType.objects.get_for_model(FriendRequest)  
    # print(q)
    print(type(q.model))
    
    
    q = Notification.objects.get(pk=1)
    print(q)
    print(type(q.content_object))
    r: FriendRequest = q.content_object
    print(r._meta.model_name)
    print(type(q))
    # print(q.id)
    # print(q.model)
    
    # req = FriendRequest.objects.get(pk=51)
    # print(req.notifications)
    # print(type(req.notifications))
    
    # if isinstance(req.notifications, GenericRelation):
    #     print(req.notifications.description)