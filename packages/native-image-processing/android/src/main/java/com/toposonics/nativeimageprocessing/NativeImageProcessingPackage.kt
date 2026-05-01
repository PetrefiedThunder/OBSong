package com.toposonics.nativeimageprocessing

import expo.modules.kotlin.ModulesProvider
import expo.modules.kotlin.modules.Module

class NativeImageProcessingPackage : ModulesProvider {
  override fun getModulesList(): List<Class<out Module>> = listOf(NativeImageProcessingModule::class.java)
}
