import ExpoModulesCore

public class NativeImageProcessingModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeImageProcessing")

    AsyncFunction("processImage") { (_: [String: Any]) -> [String: Any] in
      throw Exceptions.NotAvailable("Native image processing is currently only implemented on Android.")
    }
  }
}
