import { useState, useEffect } from 'react'
import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  Text,
  Box,
  Image,
  useToast,
  Progress,
  Switch,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  useColorModeValue
} from '@chakra-ui/react'
import axios from 'axios'
import { API_URL } from '../config'

interface VideoFormat {
  format_id: string
  resolution: string
  filesize_approx: number
  vcodec: string
  fps: number
}

interface VideoInfo {
  title: string
  duration: number
  thumbnail: string
  formats: VideoFormat[]
  download_path?: string
}

interface DownloadProgress {
  progress: number
  status: string
  downloaded: number
  total: number
  speed: string
  eta: string
  is_downloading: boolean
  title: string
}

const VideoDownloader = () => {
  const [url, setUrl] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [isAudioOnly, setIsAudioOnly] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [downloadedFiles, setDownloadedFiles] = useState<Record<string, string>>({})
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null)
  const toast = useToast()
  const boxBg = useColorModeValue('white', 'gray.800')

  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [pollInterval])

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '0:00'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown size'
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
  }

  const startProgressPolling = () => {
    if (pollInterval) {
      clearInterval(pollInterval)
    }

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/download-progress`)
        const progressData = response.data

        if (!progressData) {
          return
        }

        setDownloadProgress(progressData)
        
        if (progressData.status === 'downloading') {
          setIsLoading(true)
        } else if (progressData.status === 'finished') {
          setIsLoading(false)
          clearInterval(interval)
          setPollInterval(null)
          setDownloadProgress(null)
        } else if (progressData.status === 'error') {
          clearInterval(interval)
          setPollInterval(null)
          setIsLoading(false)
          setDownloadProgress(null)
          toast({
            title: 'Error',
            description: 'Download failed',
            status: 'error',
            duration: 3000,
            isClosable: true,
          })
        }
      } catch (error) {
        console.error('Error polling progress:', error)
        // Don't stop polling on network errors, they might be temporary
      }
    }, 1000)  // Reduced polling frequency to 1 second

    setPollInterval(interval)
  }

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl)
    setVideoInfo(null)
    setSelectedFormat('')
    setDownloadedFiles({})
  }

  const handleFetchInfo = async () => {
    if (!url) return
    setIsChecking(true)
    setVideoInfo(null)
    setSelectedFormat('')
    try {
      const formData = new FormData()
      formData.append('url', url)
      
      const response = await axios.post(`${API_URL}/api/get-video-info`, formData)
      const data = response.data
      if (!data || !data.formats) {
        throw new Error('Invalid response data')
      }
      setVideoInfo(data)
      if (data.formats.length > 0) {
        setSelectedFormat(data.formats[0].format_id)
      }
      toast({
        title: 'Video Info Loaded',
        description: `Successfully loaded info for "${data.title}"`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error: unknown) {
      console.error('Video info error:', error)
      let errorMsg = 'Failed to fetch video information'
      if (axios.isAxiosError(error) && error.response?.data?.detail) {
        errorMsg = error.response.data.detail
      }
      toast({
        title: 'Error',
        description: errorMsg,
        status: 'error',
        duration: 4000,
        isClosable: true,
      })
      setVideoInfo(null)
    } finally {
      setIsChecking(false)
    }
  }

  const handleDownload = async () => {
    if (!url) return

    setIsLoading(true)
    setDownloadProgress(null)
    
    try {
      startProgressPolling()

      const formData = new FormData()
      formData.append('url', url)
      if (isAudioOnly) {
        formData.append('format', 'mp3')
      } else {
        formData.append('format_id', selectedFormat)
      }
      formData.append('audio_only', isAudioOnly.toString())

      const response = await axios.post(`${API_URL}/api/download-video`, formData)
      const data = response.data
      if (!data) {
        throw new Error('Invalid response data')
      }
      
      const formatKey = isAudioOnly ? 'audio_only' : selectedFormat
      setDownloadedFiles(prev => ({ ...prev, [formatKey]: data.download_path }))
      
      toast({
        title: 'Success',
        description: `${isAudioOnly ? 'Audio' : 'Video'} downloaded successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Error',
        description: 'Failed to download',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setPollInterval(prev => {
        if (prev) clearInterval(prev)
        return null
      })
      setIsLoading(false)
      setDownloadProgress(null)
    }
  }

  const downloadFile = async (path: string) => {
    if (!path) return

    try {
      const response = await axios.get(`${API_URL}/api/download/${encodeURIComponent(path)}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = path
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('File download error:', error)
      toast({
        title: 'Error',
        description: 'Failed to download the file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  return (
    <VStack spacing={4} align="stretch">
      <FormControl>
        <FormLabel>Video URL</FormLabel>
        <HStack>
          <Input
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleFetchInfo()
              }
            }}
            placeholder="Enter video URL (e.g. YouTube, Vimeo, TikTok)"
          />
          <Button
            colorScheme="teal"
            onClick={handleFetchInfo}
            isLoading={isChecking}
            isDisabled={!url}
          >
            Analyze
          </Button>
        </HStack>
      </FormControl>

      {isChecking && (
        <Box textAlign="center" py={4}>
          <Text fontSize="sm" color="gray.500" mb={2}>Checking video information...</Text>
          <Progress size="xs" isIndeterminate borderRadius="full" colorScheme="gray" />
        </Box>
      )}

      {videoInfo && videoInfo.formats && !isAudioOnly && (
        <FormControl>
          <FormLabel>Quality</FormLabel>
          <Select 
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
          >
            {videoInfo.formats.map((format) => (
              <option key={format.format_id} value={format.format_id}>
                {format.resolution} ({formatFileSize(format.filesize_approx)})
              </option>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl display="flex" alignItems="center">
        <FormLabel htmlFor="audio-only" mb="0">
          Audio Only
        </FormLabel>
        <Switch
          id="audio-only"
          isChecked={isAudioOnly}
          onChange={(e) => setIsAudioOnly(e.target.checked)}
        />
      </FormControl>

      {downloadedFiles[isAudioOnly ? 'audio_only' : selectedFormat] ? (
        <Button
          colorScheme="green"
          onClick={() => downloadFile(downloadedFiles[isAudioOnly ? 'audio_only' : selectedFormat])}
          isDisabled={!url || isChecking}
        >
          Save {isAudioOnly ? 'Audio' : 'Video'} to Computer
        </Button>
      ) : (
        <Button
          colorScheme="blue"
          onClick={handleDownload}
          isLoading={isLoading}
          isDisabled={!url || isChecking}
        >
          {isAudioOnly ? 'Prepare Audio Download' : 'Prepare Video Download'}
        </Button>
      )}

      {(isLoading || downloadProgress) && (
        <Box borderWidth={1} borderRadius="lg" p={4} bg={boxBg}>
          <VStack spacing={4}>
            <Progress
              value={downloadProgress?.progress || 0}
              size="sm"
              width="100%"
              colorScheme="blue"
              borderRadius="full"
              bg={useColorModeValue('gray.100', 'gray.700')}
            />
            <StatGroup width="100%">
              <Stat>
                <StatLabel>Status</StatLabel>
                <StatNumber fontSize="md">
                  {downloadProgress?.status || 'Preparing download...'}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>Speed</StatLabel>
                <StatNumber fontSize="md">
                  {downloadProgress?.speed || '0 MB/s'}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel>ETA</StatLabel>
                <StatNumber fontSize="md">
                  {downloadProgress?.eta || 'Calculating...'}
                </StatNumber>
              </Stat>
            </StatGroup>
            {downloadProgress && (
              <Text fontSize="sm">
                Downloaded: {formatFileSize(downloadProgress.downloaded)} / {formatFileSize(downloadProgress.total)}
              </Text>
            )}
          </VStack>
        </Box>
      )}

      {videoInfo && (
        <Box borderWidth={1} borderRadius="lg" p={4}>
          <VStack spacing={3} align="stretch">
            <Text fontWeight="bold">{videoInfo.title}</Text>
            <Text>Duration: {formatDuration(videoInfo.duration)}</Text>
            {!isAudioOnly && videoInfo.thumbnail && (
              <Image src={videoInfo.thumbnail} maxH="200px" objectFit="contain" />
            )}
          </VStack>
        </Box>
      )}
    </VStack>
  )
}

export default VideoDownloader