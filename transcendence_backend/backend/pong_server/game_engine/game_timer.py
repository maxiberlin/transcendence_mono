import time
from typing import Literal

class GameTimer:
    def __init__(self, tick_rate: int) -> None:
        self.__started_sec = time.time()
        self.__tick_rate = tick_rate
        self.__tick_duration = 1/tick_rate
        self.__current_tick: int = int(0)
        self.__elapsed_seconds: int = int(0)
        
        self.__tick_time_sice_start = self.__started_sec
        
        self.__stopw_start_perf = self.__stopw_end_perf = self.__started_perf = time.perf_counter()
    
    def start_game(self):
        self.__started_sec = time.time()
        self.__started_perf = time.perf_counter()
        self.__tick_time_sice_start = self.__started_sec
        
    def get_initial_sleep_time(self):
        return max( 0.0, self.__tick_duration - (time.perf_counter() - self.__started_perf) )
        
    def get_start_time(self, u: Literal["s", "ms"]):
        return self.__started_sec if u == "s" else self.__started_sec*1000
        

    def stopwatch_start(self):
        self.__stopw_start_perf = time.perf_counter()
        self.__current_tick += 1
        self.__tick_time_sice_start = self.__current_tick * self.__tick_duration
        pass
    
    def stopwatch_end(self):
        a = self.__tick_duration
        b = time.perf_counter()
        c = self.__stopw_start_perf
        d = self.__started_perf
        e = self.__tick_time_sice_start
        
        ts = max( 0.0, a - ( ( (c - d)  -  e ) + (b - c) ) )
        # ts = max( 0.0, self.__tick_duration - self.__stopw_end_perf + self.__started_perf + self.__tick_time_sice_start )
        # ts = max( 0.0, a - (b - d - e) )
        # ts = max( 0.0, self.__tick_duration - ( self.__stopw_end_perf - self.__started_perf - self.__tick_time_sice_start ) )
        return ts
    
    def get_tick_duration(self, u: Literal["s", "ms"]):
        return self.__tick_duration if u == "s" else self.__tick_duration * 1000

    def get_tick_time_since_start(self, u: Literal["s", "ms"]):
        if u == "s":
            return self.__tick_time_sice_start
        return self.__tick_time_sice_start * 1000
    
    def get_current_tick(self):
        return self.__current_tick

    def get_tick_time_unix(self, u: Literal["s", "ms"]):
        if u == "s":
            return self.__started_sec + self.__tick_time_sice_start
        return (self.__started_sec + self.__tick_time_sice_start) * 1000

# class GameTimer:
#     def __init__(self, tick_rate: int) -> None:
        
#         self.__tick_rate = tick_rate
#         self.__tick_duration = 1/tick_rate
#         self.__current_tick: int = int(0)
#         self.__elapsed_seconds: int = int(0)
        
#         self.__tick_time_sice_start = 0
        
#         self.__simulation_time_sec = self.__tick_duration
        
#         self.time_processing_sec = float(0)
        
#         self.__started_sec = time.time()
#         self.__stopw_start_perf = self.__stopw_end_perf = self.__started_perf = time.perf_counter()
    
#     def start_game(self):
#         self.__started_sec = time.time()
#         self.__stopw_start_perf = self.__stopw_end_perf = self.__started_perf = time.perf_counter()

#     def get_initial_sleep_time(self):
#         return self.stopwatch_end()


#     def get_start_time(self, u: Literal["s", "ms"]):
#         return self.__started_sec if u == "s" else self.__started_sec*1000
        

#     def stopwatch_start(self):
#         self.__stopw_start_perf = time.perf_counter()
#         self.__current_tick += 1
#         self.__simulation_time_sec = (self.__stopw_start_perf - self.__stopw_end_perf) + self.time_processing_sec
#         self.__tick_time_sice_start += self.__simulation_time_sec
#         pass
    
#     def stopwatch_end(self):
#         self.__stopw_end_perf = time.perf_counter()
#         self.time_processing_sec = (self.__stopw_end_perf - self.__stopw_start_perf)
#         return max(0.0, self.__tick_duration - self.time_processing_sec)
        
    
#     def get_tick_duration(self, u: Literal["s", "ms"]):
#         return self.__simulation_time_sec if u == "s" else self.__simulation_time_sec * 1000

#     def get_tick_time_since_start(self, u: Literal["s", "ms"]):
#         if u == "s":
#             return self.__tick_time_sice_start
#         return self.__tick_time_sice_start * 1000
    
#     def get_current_tick(self):
#         return self.__current_tick

#     def get_tick_time_unix(self, u: Literal["s", "ms"]):
#         if u == "s":
#             return self.__started_sec + self.__tick_time_sice_start
#         return (self.__started_sec + self.__tick_time_sice_start) * 1000




# class GameTimer:
#     def __init__(self, tick_rate: int) -> None:
#         self.__started_sec = time.time()
#         self.__tick_rate = tick_rate
#         self.__tick_duration = 1/tick_rate
#         self.__current_tick: int = int(0)
#         self.__elapsed_seconds: int = int(0)
        
#         self.__tick_time_sice_start = self.__started_sec
        
#         self.__stopw_start_perf = self.__stopw_end_perf = self.__started_perf = time.perf_counter()
    
#     def start_game(self):
#         self.__started_sec = time.time()
#         self.__started_perf = time.perf_counter()
#         self.__tick_time_sice_start = self.__started_sec
        
#     def get_initial_sleep_time(self):
#         return max( 0.0, self.__tick_duration - (time.perf_counter() - self.__started_perf) )
        
#     def get_start_time(self, u: Literal["s", "ms"]):
#         return self.__started_sec if u == "s" else self.__started_sec*1000
        

#     def stopwatch_start(self):
#         self.__stopw_start_perf = time.perf_counter()
#         self.__current_tick += 1
#         self.__tick_time_sice_start = self.__current_tick * self.__tick_duration
#         pass
    
#     def stopwatch_end(self):
#         a = self.__tick_duration
#         b = time.perf_counter()
#         c = self.__stopw_start_perf
#         d = self.__started_perf
#         e = self.__tick_time_sice_start
        
#         ts = max( 0.0, a - ( ( (c - d)  -  e ) + (b - c) ) )
#         # ts = max( 0.0, self.__tick_duration - self.__stopw_end_perf + self.__started_perf + self.__tick_time_sice_start )
#         # ts = max( 0.0, a - (b - d - e) )
#         # ts = max( 0.0, self.__tick_duration - ( self.__stopw_end_perf - self.__started_perf - self.__tick_time_sice_start ) )
#         return ts
    
#     def get_tick_duration(self, u: Literal["s", "ms"]):
#         return self.__tick_duration if u == "s" else self.__tick_duration * 1000

#     def get_tick_time_since_start(self, u: Literal["s", "ms"]):
#         if u == "s":
#             return self.__tick_time_sice_start
#         return self.__tick_time_sice_start * 1000
    
#     def get_current_tick(self):
#         return self.__current_tick

#     def get_tick_time_unix(self, u: Literal["s", "ms"]):
#         if u == "s":
#             return self.__started_sec + self.__tick_time_sice_start
#         return (self.__started_sec + self.__tick_time_sice_start) * 1000
