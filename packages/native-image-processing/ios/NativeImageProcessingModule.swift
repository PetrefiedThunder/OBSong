import ExpoModulesCore

public class NativeImageProcessingModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeImageProcessing")

    // The iOS side is a stub. Expose an explicit availability flag so
    // isNativeImageProcessingAvailable() in JS doesn't false-positive on the mere
    // presence of the processImage function (which always throws here).
    Constants([
      "isAvailable": false
    ])

    AsyncFunction("processImage") { (_: [String: Any]) -> [String: Any] in
      throw Exceptions.NotAvailable("Native image processing is currently only implemented on Android.")
    }
  }
}
