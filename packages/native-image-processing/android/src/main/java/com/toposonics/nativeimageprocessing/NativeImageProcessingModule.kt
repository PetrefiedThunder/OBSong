package com.toposonics.nativeimageprocessing

import android.net.Uri
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

class NativeImageProcessingModule : Module() {
  companion object {
    init {
      try {
        System.loadLibrary("native-image-processing")
      } catch (err: UnsatisfiedLinkError) {
        Log.e("NativeImageProcessing", "Failed to load native-image-processing library", err)
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("NativeImageProcessing")

    AsyncFunction("processImage") { options: ImageProcessingOptions ->
      require(options.uri != null || options.textureId != null) { "A file URI or texture ID is required" }

      val targetWidth = options.targetWidth ?: 640
      val dimensions = IntArray(2)

      val pixelBytes = withContext(Dispatchers.Default) {
        when {
          options.textureId != null -> nativeExtractFromTexture(options.textureId, targetWidth, dimensions)
          options.uri != null -> nativeExtractFromFile(options.uri, targetWidth, dimensions)
          else -> ByteArray(0)
        }
      }

      mapOf(
        "pixels" to pixelBytes,
        "width" to dimensions[0],
        "height" to dimensions[1]
      )
    }
  }

  private external fun nativeExtractFromFile(uri: String, targetWidth: Int, dimensions: IntArray): ByteArray
  private external fun nativeExtractFromTexture(textureId: Int?, targetWidth: Int, dimensions: IntArray): ByteArray
}

data class ImageProcessingOptions(
  val uri: String? = null,
  val textureId: Int? = null,
  val targetWidth: Int? = null
)
