cmake_minimum_required(VERSION 3.13)
project(native-image-processing)

set(OpenCV_STATIC ON)
find_package(OpenCV REQUIRED core imgcodecs imgproc)

add_library(native-image-processing SHARED native-image-processing.cpp)

target_include_directories(native-image-processing PRIVATE ${OpenCV_INCLUDE_DIRS})

target_link_libraries(
  native-image-processing
  ${OpenCV_LIBS}
  log
)
