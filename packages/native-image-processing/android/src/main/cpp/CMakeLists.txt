cmake_minimum_required(VERSION 3.13)
project(native-image-processing)

# Configure OpenCV from local installation
set(OpenCV_STATIC ON)
set(OpenCV_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../libs/opencv/sdk/native/jni")

# Find OpenCV package with required modules
find_package(OpenCV REQUIRED core imgcodecs imgproc)

add_library(native-image-processing SHARED native-image-processing.cpp)

target_include_directories(native-image-processing PRIVATE ${OpenCV_INCLUDE_DIRS})

target_link_libraries(
  native-image-processing
  ${OpenCV_LIBS}
  log
)
