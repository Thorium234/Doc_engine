cmake_minimum_required(VERSION 3.10)
project(DocumentConverter)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add source files
set(SOURCES
    converter.cpp
)

# Create executable
add_executable(pdf_converter ${SOURCES})

# Include directories
include_directories(${CMAKE_SOURCE_DIR})

# Compiler flags
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    target_compile_options(pdf_converter PRIVATE -Wall -Wextra -O2)
endif()

# Install target
install(TARGETS pdf_converter
    RUNTIME DESTINATION bin
)