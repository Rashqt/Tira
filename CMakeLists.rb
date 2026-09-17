cmake_minimum_required(VERSION 3.10)
project(TiraBackend)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O2 -Wall")

find_package(Threads REQUIRED)  # Added for threading support

add_executable(tira_server tira_backend.cpp)

if(WIN32)
    target_link_libraries(tira_server ws2_32)
endif()

target_link_libraries(tira_server Threads::Threads)  # Link threading library