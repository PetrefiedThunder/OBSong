package com.toposonics.nativeimageprocessing

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.net.Uri
import android.provider.OpenableColumns
import androidx.exifinterface.media.ExifInterface
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

class NativeImageProcessingModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NativeImageProcessing")

    AsyncFunction("processImage") { options: ImageProcessingOptions ->
      require(options.uri != null || options.textureId != null) { "A file URI or texture ID is required" }
      require(options.textureId == null) {
        "Texture extraction is not supported on Android. Provide a file:// or content:// image URI."
      }

      val targetWidth = validateTargetWidth(options.targetWidth)
      val resolvedImage = requireNotNull(options.uri?.let { resolveImageUri(it) }) {
        "A file:// or content:// image URI is required"
      }

      var bitmapToRecycle: Bitmap? = null
      try {
        val sourceBitmap = decodeSampledBitmap(resolvedImage.file, targetWidth)
        bitmapToRecycle = sourceBitmap

        val orientedBitmap = applyExifOrientation(sourceBitmap, resolvedImage.file.absolutePath)
        if (orientedBitmap !== sourceBitmap) {
          sourceBitmap.recycle()
          bitmapToRecycle = orientedBitmap
        }

        val resizedBitmap = resizeBitmap(orientedBitmap, targetWidth)
        if (resizedBitmap !== orientedBitmap) {
          orientedBitmap.recycle()
          bitmapToRecycle = resizedBitmap
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

        result.toMap()
      } finally {
        bitmapToRecycle?.takeUnless { it.isRecycled }?.recycle()
        if (resolvedImage.deleteAfterUse && resolvedImage.file.exists()) {
          resolvedImage.file.delete()
        }
      }
    }
  }

  private fun resolveImageUri(uriString: String): ResolvedImage {
    val uri = Uri.parse(uriString)
    return when (uri.scheme?.lowercase(Locale.US)) {
      null -> ResolvedImage(File(uriString), deleteAfterUse = false)
      "file" -> ResolvedImage(File(requireNotNull(uri.path) { "Invalid file URI" }), deleteAfterUse = false)
      "content" -> copyContentUriToCache(uri)
      else -> throw IllegalArgumentException(
        "Unsupported image URI scheme \"${uri.scheme}\". Only file:// and content:// images can be processed."
      )
    }
  }

  private fun copyContentUriToCache(uri: Uri): ResolvedImage {
    val context = requireNotNull(appContext.reactContext) { "React context is unavailable" }
    val cacheFile = File.createTempFile("toposonics-image-", ".tmp", context.cacheDir)

    try {
      val contentSize = getContentUriSize(uri)
      require(contentSize == null || contentSize <= MAX_INPUT_BYTES) {
        "Image file is too large for on-device processing. Please choose an image up to $MAX_INPUT_MEGABYTES MB."
      }

      context.contentResolver.openInputStream(uri).use { input ->
        requireNotNull(input) { "Unable to open content image URI for native processing" }
        FileOutputStream(cacheFile).use { output ->
          val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
          var bytesCopied = 0L

          while (true) {
            val bytesRead = input.read(buffer)
            if (bytesRead == -1) {
              break
            }

            bytesCopied += bytesRead
            require(bytesCopied <= MAX_INPUT_BYTES) {
              "Image file is too large for on-device processing. Please choose an image up to $MAX_INPUT_MEGABYTES MB."
            }
            output.write(buffer, 0, bytesRead)
          }
        }
      }
    } catch (error: Throwable) {
      cacheFile.delete()
      throw error
    }

    return ResolvedImage(cacheFile, deleteAfterUse = true)
  }

  private fun getContentUriSize(uri: Uri): Long? {
    val context = requireNotNull(appContext.reactContext) { "React context is unavailable" }

    return context.contentResolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)?.use { cursor ->
      if (!cursor.moveToFirst()) {
        return@use null
      }

      val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
      if (sizeIndex < 0 || cursor.isNull(sizeIndex)) {
        null
      } else {
        cursor.getLong(sizeIndex).takeIf { it > 0 }
      }
    }
  }

  private fun validateTargetWidth(targetWidth: Int?): Int {
    val value = targetWidth ?: DEFAULT_TARGET_WIDTH
    require(value in 1..MAX_TARGET_WIDTH) {
      "targetWidth must be between 1 and $MAX_TARGET_WIDTH pixels"
    }
    return value
  }

  private fun decodeSampledBitmap(file: File, targetWidth: Int): Bitmap {
    require(file.exists() && file.canRead()) {
      "Image file is not readable for native processing"
    }
    require(file.length() <= MAX_INPUT_BYTES) {
      "Image file is too large for on-device processing. Please choose an image up to $MAX_INPUT_MEGABYTES MB."
    }

    val boundsOptions = BitmapFactory.Options().apply {
      inJustDecodeBounds = true
    }
    BitmapFactory.decodeFile(file.absolutePath, boundsOptions)

    val width = boundsOptions.outWidth
    val height = boundsOptions.outHeight
    require(width > 0 && height > 0) {
      "Failed to read image bounds. Please choose a supported JPEG, PNG, or WebP image."
    }

    val inputPixels = width.toLong() * height.toLong()
    require(inputPixels <= MAX_INPUT_PIXELS) {
      "Image dimensions are too large for on-device processing (${width}x${height}). Please choose an image up to $MAX_INPUT_MEGAPIXELS MP."
    }

    val decodeOptions = BitmapFactory.Options().apply {
      inSampleSize = calculateInSampleSize(width, height, targetWidth)
      inPreferredConfig = Bitmap.Config.ARGB_8888
    }

    return requireNotNull(BitmapFactory.decodeFile(file.absolutePath, decodeOptions)) {
      "Failed to decode image for native processing. Please choose a supported JPEG, PNG, or WebP image."
    }
  }

  private fun calculateInSampleSize(width: Int, height: Int, targetWidth: Int): Int {
    val requestedHeight = max(1, (height * (targetWidth.toDouble() / width)).toInt())
    var sampleSize = 1
    val halfHeight = height / 2
    val halfWidth = width / 2

    while (halfHeight / sampleSize >= requestedHeight && halfWidth / sampleSize >= targetWidth) {
      sampleSize *= 2
    }
    while (decodedPixels(width, height, sampleSize) > MAX_DECODED_PIXELS) {
      sampleSize *= 2
    }

    return sampleSize
  }

  private fun decodedPixels(width: Int, height: Int, sampleSize: Int): Long {
    val decodedWidth = (width + sampleSize - 1) / sampleSize
    val decodedHeight = (height + sampleSize - 1) / sampleSize
    return decodedWidth.toLong() * decodedHeight.toLong()
  }

  private fun applyExifOrientation(bitmap: Bitmap, path: String): Bitmap {
    val orientation = try {
      ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
    } catch (_: Throwable) {
      ExifInterface.ORIENTATION_NORMAL
    }

    val matrix = Matrix()
    when (orientation) {
      ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.preScale(-1f, 1f)
      ExifInterface.ORIENTATION_ROTATE_180 -> matrix.postRotate(180f)
      ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.preScale(1f, -1f)
      ExifInterface.ORIENTATION_TRANSPOSE -> {
        matrix.postRotate(90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_90 -> matrix.postRotate(90f)
      ExifInterface.ORIENTATION_TRANSVERSE -> {
        matrix.postRotate(-90f)
        matrix.postScale(-1f, 1f)
      }
      ExifInterface.ORIENTATION_ROTATE_270 -> matrix.postRotate(270f)
      else -> return bitmap
    }

    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
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

private data class ResolvedImage(
  val file: File,
  val deleteAfterUse: Boolean
)

private const val DEFAULT_TARGET_WIDTH = 640
private const val MAX_TARGET_WIDTH = 4096
private const val MAX_INPUT_BYTES = 80L * 1024L * 1024L
private const val MAX_INPUT_MEGABYTES = 80
private const val MAX_INPUT_PIXELS = 64L * 1000L * 1000L
private const val MAX_INPUT_MEGAPIXELS = 64
private const val MAX_DECODED_PIXELS = 12L * 1000L * 1000L

class ImageProcessingOptions : Record {
  @Field
  var uri: String? = null

  @Field
  var textureId: Int? = null

  @Field
  var targetWidth: Int? = null

  @Field
  var includeRidgeStrength: Boolean? = false
}
