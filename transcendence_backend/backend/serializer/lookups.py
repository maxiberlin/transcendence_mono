from django.db import models
from django.db.models.fields import related
from friends.models import FriendRequest


class School(models.Model):
    school_name = models.CharField()
    street = models.CharField()

class Person(models.Model):
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    age = models.IntegerField()

class Books(models.Model):
    person = models.ForeignKey(Person, on_delete=models.CASCADE)
    book_name = models.CharField()
    


def lkp(m: related.ForwardManyToOneDescriptor):
    m.field
    pass

lkp(FriendRequest.notifications)


def l_exact(q: str):
    return f"{q}_exact"

def l_iexact(q: str):
    return f"{q}_iexact"

def l_contains(q: str):
    return f"{q}_contains"

def l_icontains(q: str):
    return f"{q}_icontains"

def l_in(q: str):
    return f"{q}_in"

def l_gt(q: str):
    return f"{q}_gt"

def l_gte(q: str):
    return f"{q}_gte"

def l_lt(q: str):
    return f"{q}_lt"

def l_lte(q: str):
    return f"{q}_lte"

def l_startswith(q: str):
    return f"{q}_startswith"

def l_istartswith(q: str):
    return f"{q}_istartswith"

def l_endswith(q: str):
    return f"{q}_endswith"

def l_iendswith(q: str):
    return f"{q}_iendswith"

def l_range(q: str):
    return f"{q}_range"

def l_year(q: str):
    return f"{q}_year"

def l_month(q: str):
    return f"{q}_month"

def l_day(q: str):
    return f"{q}_day"

def l_week_day(q: str):
    return f"{q}_week_day"

def l_isnull(q: str):
    return f"{q}_isnull"

def l_search(q: str):
    return f"{q}_search"

def l_regex(q: str):
    return f"{q}_regex"

def l_iregex(q: str):
    return f"{q}_iregex"

