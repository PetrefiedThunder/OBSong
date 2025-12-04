package com.toposonics.nativeimageprocessing

import expo.modules.kotlin.ModulesProvider

class NativeImageProcessingPackage : ModulesProvider {
  override fun getModulesList() = listOf(NativeImageProcessingModule())
}
