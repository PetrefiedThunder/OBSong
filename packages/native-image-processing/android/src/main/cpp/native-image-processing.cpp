#include <jni.h>
#include <android/bitmap.h>
#include <opencv2/imgcodecs.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/core.hpp>
#include <vector>
#include <string>

static cv::Mat readImageFromPath(JNIEnv* env, jstring path) {
  const char* utfPath = env->GetStringUTFChars(path, nullptr);
  std::string imagePath(utfPath);
  env->ReleaseStringUTFChars(path, utfPath);

  cv::Mat image = cv::imread(imagePath, cv::IMREAD_UNCHANGED);
  return image;
}

static void ensureRgba(cv::Mat& src) {
  if (src.channels() == 4) {
    return;
  }
  if (src.channels() == 3) {
    cv::cvtColor(src, src, cv::COLOR_BGR2RGBA);
  } else if (src.channels() == 1) {
    cv::cvtColor(src, src, cv::COLOR_GRAY2RGBA);
  }
}

static jbyteArray matToByteArray(JNIEnv* env, const cv::Mat& mat) {
  const size_t size = mat.total() * mat.elemSize();
  jbyteArray result = env->NewByteArray(static_cast<jsize>(size));
  env->SetByteArrayRegion(result, 0, static_cast<jsize>(size), reinterpret_cast<const jbyte*>(mat.data));
  return result;
}

static void setDimensions(JNIEnv* env, jintArray dimensions, int width, int height) {
  jint values[2];
  values[0] = width;
  values[1] = height;
  env->SetIntArrayRegion(dimensions, 0, 2, values);
}

extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_toposonics_nativeimageprocessing_NativeImageProcessingModule_nativeExtractFromFile(
    JNIEnv* env,
    jobject /* this */,
    jstring path,
    jint targetWidth,
    jintArray dimensions) {
  cv::Mat image = readImageFromPath(env, path);
  if (image.empty()) {
    return env->NewByteArray(0);
  }

  const double aspect = static_cast<double>(image.cols) / static_cast<double>(image.rows);
  int resizedWidth = targetWidth;
  int resizedHeight = static_cast<int>(resizedWidth / aspect);
  cv::Mat resized;
  cv::resize(image, resized, cv::Size(resizedWidth, resizedHeight), 0, 0, cv::INTER_AREA);
  ensureRgba(resized);

  setDimensions(env, dimensions, resized.cols, resized.rows);
  return matToByteArray(env, resized);
}

extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_toposonics_nativeimageprocessing_NativeImageProcessingModule_nativeExtractFromTexture(
    JNIEnv* env,
    jobject /* this */,
    jobject textureId,
    jint targetWidth,
    jintArray dimensions) {
  // Texture extraction is platform-specific; this placeholder simply returns an empty array while
  // still reporting zeroed dimensions so the JS caller can handle unsupported states gracefully.
  setDimensions(env, dimensions, 0, 0);
  return env->NewByteArray(0);
}
