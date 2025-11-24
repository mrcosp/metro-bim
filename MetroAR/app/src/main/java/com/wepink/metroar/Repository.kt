package com.wepink.metroar
import retrofit2.Response
class Repository(
    private val api: ApiService = ApiClient.apiService
) {

    suspend fun uploadCapture(request: CaptureRequest) =
        api.uploadCapture(request)

    suspend fun fetchFolders() =
        api.getFolders()

    suspend fun fetchImages(folderName: String): Response<List<ImageResponse>> {
        return api.getImagesFromFolder(folderName)
    }

    suspend fun createFolder(name: String): Response<DefaultResponse> {
        return api.createFolder(FolderRequest(name))
    }
}
