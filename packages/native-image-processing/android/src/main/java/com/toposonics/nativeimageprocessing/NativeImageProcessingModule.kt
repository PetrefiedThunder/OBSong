package com.toposonics.nativeimageprocessing

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

class NativeImageProcessingModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeImageProcessing")

    AsyncFunction("processImage") { options: ImageProcessingOptions ->
      require(options.uri != null || options.textureId != null) { "A file URI or texture ID is required" }
      require(options.textureId == null) { "Texture extraction is not supported yet" }

      val targetWidth = options.targetWidth ?: 640
      val resolvedPath = requireNotNull(options.uri?.let { resolveImageUri(it) }) { "A file URI is required" }
      val sourceBitmap = requireNotNull(BitmapFactory.decodeFile(resolvedPath)) {
        "Failed to decode image for native processing"
      }
      val resizedBitmap = resizeBitmap(sourceBitmap, targetWidth)
      if (resizedBitmap !== sourceBitmap) {
        sourceBitmap.recycle()
      }

      val pixelBytes = bitmapToRgbaBytes(resizedBitmap)
      val result = mutableMapOf<String, Any>(
        "pixels" to pixelBytes,
        "width" to resizedBitmap.width,
        "height" to resizedBitmap.height
      )

      if (options.includeRidgeStrength == true) {
        result["ridgeStrength"] = computeRidgeStrength(resizedBitmap)
        result["ridgeWidth"] = resizedBitmap.width
        result["ridgeHeight"] = resizedBitmap.height
      }

      resizedBitmap.recycle()
      result.toMap()
    }
  }

  private fun resolveImageUri(uriString: String): String {
    val uri = Uri.parse(uriString)
    return when (uri.scheme) {
      null -> uriString
      "file" -> requireNotNull(uri.path) { "Invalid file URI" }
      "content" -> copyContentUriToCache(uri)
      else -> uriString
    }
  }

  private fun copyContentUriToCache(uri: Uri): String {
    val context = requireNotNull(appContext.reactContext) { "React context is unavailable" }
    val cacheFile = File.createTempFile("toposonics-image-", ".tmp", context.cacheDir)

    context.contentResolver.openInputStream(uri).use { input ->
      requireNotNull(input) { "Unable to open image URI" }
      FileOutputStream(cacheFile).use { output ->
        input.copyTo(output)
      }
    }

    return cacheFile.absolutePath
  }

  private fun resizeBitmap(bitmap: Bitmap, targetWidth: Int): Bitmap {
    if (targetWidth <= 0 || bitmap.width <= targetWidth) {
      return bitmap
    }

    val targetHeight = max(1, (bitmap.height * (targetWidth.toFloat() / bitmap.width)).toInt())
    return Bitmap.createScaledBitmap(bitmap, targetWidth, targetHeight, true)
  }

  private fun bitmapToRgbaBytes(bitmap: Bitmap): ByteArray {
    val pixels = IntArray(bitmap.width * bitmap.height)
    bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)

    val bytes = ByteArray(pixels.size * 4)
    pixels.forEachIndexed { index, pixel ->
      val offset = index * 4
      bytes[offset] = ((pixel shr 16) and 0xff).toByte()
      bytes[offset + 1] = ((pixel shr 8) and 0xff).toByte()
      bytes[offset + 2] = (pixel and 0xff).toByte()
      bytes[offset + 3] = ((pixel ushr 24) and 0xff).toByte()
    }

    return bytes
  }

  private fun computeRidgeStrength(bitmap: Bitmap): ByteArray {
    val width = bitmap.width
    val height = bitmap.height
    val pixels = IntArray(width * height)
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

    val grayscale = DoubleArray(pixels.size)
    pixels.forEachIndexed { index, pixel ->
      val red = (pixel shr 16) and 0xff
      val green = (pixel shr 8) and 0xff
      val blue = pixel and 0xff
      grayscale[index] = 0.299 * red + 0.587 * green + 0.114 * blue
    }

    val magnitudes = DoubleArray(pixels.size)
    var maxMagnitude = 0.0
    val sobelX = intArrayOf(-1, 0, 1, -2, 0, 2, -1, 0, 1)
    val sobelY = intArrayOf(-1, -2, -1, 0, 0, 0, 1, 2, 1)

    for (y in 0 until height) {
      for (x in 0 until width) {
        var gradientX = 0.0
        var gradientY = 0.0

        for (kernelY in -1..1) {
          for (kernelX in -1..1) {
            val sampleX = min(width - 1, max(0, x + kernelX))
            val sampleY = min(height - 1, max(0, y + kernelY))
            val kernelIndex = (kernelY + 1) * 3 + (kernelX + 1)
            val sample = grayscale[sampleY * width + sampleX]
            gradientX += sample * sobelX[kernelIndex]
            gradientY += sample * sobelY[kernelIndex]
          }
        }

        val magnitude = sqrt(gradientX * gradientX + gradientY * gradientY)
        magnitudes[y * width + x] = magnitude
        maxMagnitude = max(maxMagnitude, magnitude)
      }
    }

    if (maxMagnitude <= 0.0) {
      return ByteArray(pixels.size)
    }

    return ByteArray(pixels.size) { index ->
      val normalized = (abs(magnitudes[index]) / maxMagnitude) * 255.0
      normalized.toInt().coerceIn(0, 255).toByte()
    }
  }
}

data class ImageProcessingOptions(
  val uri: String? = null,
  val textureId: Int? = null,
  val targetWidth: Int? = null,
  val includeRidgeStrength: Boolean? = false
)
