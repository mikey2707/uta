import { useState, useCallback, useEffect } from 'react'
import {
  Button,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  Select,
  VStack,
  Text,
  Box,
  useToast,
  Progress,
  SimpleGrid,
  IconButton,
  HStack,
  useColorModeValue,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Checkbox,
  Image,
} from '@chakra-ui/react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { CloseIcon, DownloadIcon } from '@chakra-ui/icons'
import { API_URL } from '../config'

interface ProcessedFile {
  filename: string
  url: string
}

const FilePreview = ({ file }: { file: File }) => {
  const [url, setUrl] = useState<string>('')
  
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return (
    <Image 
      src={url} 
      alt={file.name} 
      objectFit="cover" 
      h="120px" 
      w="full" 
      borderRadius="md" 
      mb={2}
      bg="gray.100"
    />
  )
}

const ImageConverter = () => {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState('png')
  const [width, setWidth] = useState<number | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [quality, setQuality] = useState(90)
  const [maintainRatio, setMaintainRatio] = useState(true)
  const [stripMetadata, setStripMetadata] = useState(true)
  const [filterType, setFilterType] = useState('none')
  const [rotation, setRotation] = useState('0')
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const toast = useToast()

  const borderColor = useColorModeValue('gray.200', 'gray.600')
  const hoverBorderColor = useColorModeValue('blue.500', 'blue.300')
  const bgColor = useColorModeValue('gray.50', 'gray.700')
  const boxBg = useColorModeValue('white', 'gray.800')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.ico', '.webp']
    },
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleConvert = async () => {
    if (files.length === 0) return

    setIsLoading(true)
    setProgress(0)
    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })
      formData.append('format', format)
      if (width) formData.append('width', width.toString())
      if (height) formData.append('height', height.toString())
      formData.append('quality', quality.toString())
      formData.append('maintain_aspect_ratio', maintainRatio.toString())
      formData.append('strip_metadata', stripMetadata.toString())
      formData.append('filter_type', filterType)
      formData.append('rotation', rotation)

      const response = await axios.post(`${API_URL}/api/convert-image`, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(percentCompleted)
          }
        }
      })
      setProcessedFiles(response.data.files || [])
      
      toast({
        title: 'Success',
        description: 'Images converted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Conversion error:', error)
      toast({
        title: 'Error',
        description: 'Failed to convert images',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
      setProgress(100)
    }
  }

  const downloadFile = async (file: ProcessedFile) => {
    try {
      const response = await axios.get(`${API_URL}${file.url}`, {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      toast({
        title: 'Error',
        description: 'Failed to download file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  }

  return (
    <VStack spacing={6} align="stretch">
      <Box
        {...getRootProps()}
        p={8}
        border="2px dashed"
        borderColor={isDragActive ? hoverBorderColor : borderColor}
        borderRadius="xl"
        bg={bgColor}
        transition="all 0.2s"
        _hover={{ borderColor: hoverBorderColor }}
        cursor="pointer"
      >
        <input {...getInputProps()} />
        <VStack spacing={2}>
          <Text fontSize="lg" fontWeight="medium">
            {isDragActive
              ? "Drop the images here"
              : "Drag 'n' drop images here, or click to select"}
          </Text>
          <Text fontSize="sm" color="gray.500">
            Supports PNG, JPG, JPEG, ICO, WebP
          </Text>
        </VStack>
      </Box>

      {files.length > 0 && (
        <Box>
          <Text fontWeight="medium" mb={2}>Selected Files:</Text>
          <SimpleGrid columns={[1, 2, 3]} spacing={4}>
            {files.map((file, index) => (
              <Box
                key={index}
                p={2}
                borderWidth={1}
                borderRadius="md"
                bg={boxBg}
                position="relative"
              >
                <IconButton
                  aria-label="Remove file"
                  icon={<CloseIcon />}
                  size="sm"
                  position="absolute"
                  top={1}
                  right={1}
                  onClick={() => removeFile(index)}
                  zIndex={1}
                  colorScheme="red"
                  variant="solid"
                />
                <FilePreview file={file} />
                <Text noOfLines={1} fontSize="sm">{file.name}</Text>
              </Box>
            ))}
          </SimpleGrid>

          <VStack spacing={4} mt={4}>
            <FormControl>
              <FormLabel>Output Format</FormLabel>
              <Select 
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                bg={boxBg}
              >
                <option value="png">PNG</option>
                <option value="jpg">JPEG</option>
                <option value="webp">WebP</option>
                <option value="ico">ICO</option>
              </Select>
            </FormControl>

            {['jpg', 'webp'].includes(format) && (
              <FormControl>
                <FormLabel>Quality ({quality}%)</FormLabel>
                <Slider value={quality} onChange={(v) => setQuality(v)} min={1} max={100}>
                  <SliderTrack bg={borderColor}>
                    <SliderFilledTrack bg="blue.500" />
                  </SliderTrack>
                  <SliderThumb boxSize={6} />
                </Slider>
              </FormControl>
            )}

            <HStack spacing={4} width="full">
              <FormControl>
                <FormLabel>Width (optional)</FormLabel>
                <NumberInput
                  value={width || ''}
                  onChange={(_, val) => setWidth(val)}
                >
                  <NumberInputField placeholder="Auto" bg={boxBg} />
                </NumberInput>
              </FormControl>

              <FormControl>
                <FormLabel>Height (optional)</FormLabel>
                <NumberInput
                  value={height || ''}
                  onChange={(_, val) => setHeight(val)}
                >
                  <NumberInputField placeholder="Auto" bg={boxBg} />
                </NumberInput>
              </FormControl>
            </HStack>

            <Checkbox 
              isChecked={maintainRatio} 
              onChange={(e) => setMaintainRatio(e.target.checked)}
              colorScheme="blue"
              alignSelf="flex-start"
            >
              Maintain Aspect Ratio
            </Checkbox>

            <HStack spacing={4} width="full">
              <FormControl>
                <FormLabel>Filter</FormLabel>
                <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} bg={boxBg}>
                  <option value="none">None</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="blur">Blur</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Rotation</FormLabel>
                <Select value={rotation} onChange={(e) => setRotation(e.target.value)} bg={boxBg}>
                  <option value="0">0°</option>
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="270">270°</option>
                </Select>
              </FormControl>
            </HStack>

            <Checkbox 
              isChecked={stripMetadata} 
              onChange={(e) => setStripMetadata(e.target.checked)}
              colorScheme="blue"
              alignSelf="flex-start"
            >
              Strip Metadata (Privacy)
            </Checkbox>

            <Button
              colorScheme="blue"
              onClick={handleConvert}
              isLoading={isLoading}
              width="full"
            >
              Convert {files.length} {files.length === 1 ? 'Image' : 'Images'}
            </Button>
          </VStack>
        </Box>
      )}

      {isLoading && (
        <Box borderWidth={1} borderRadius="lg" p={4} bg={boxBg}>
          <VStack spacing={2}>
            <Text fontWeight="medium">Converting Images...</Text>
            <Progress
              value={progress}
              size="sm"
              width="100%"
              colorScheme="blue"
              borderRadius="full"
              bg={useColorModeValue('gray.100', 'gray.700')}
            />
            <Text fontSize="sm">{progress}% Complete</Text>
          </VStack>
        </Box>
      )}

      {processedFiles.length > 0 && (
        <Box>
          <Text fontWeight="medium" mb={2}>Converted Files:</Text>
          <SimpleGrid columns={[1, 2]} spacing={4}>
            {processedFiles.map((file, index) => (
              <Box
                key={index}
                p={4}
                borderWidth={1}
                borderRadius="md"
                bg={boxBg}
              >
                <VStack spacing={4}>
                  <Image 
                    src={`${API_URL}${file.url}`} 
                    alt={file.filename} 
                    objectFit="cover" 
                    h="200px" 
                    w="full" 
                    borderRadius="md" 
                    bg="gray.100"
                  />
                  <HStack width="full" justify="space-between">
                    <VStack align="start" spacing={0} flex={1} overflow="hidden">
                      <Text noOfLines={1} width="full">{file.filename}</Text>
                      <Text fontSize="sm" color="gray.500">
                        Converted to: {format.toUpperCase()}
                      </Text>
                    </VStack>
                    <IconButton
                      aria-label="Download"
                      icon={<DownloadIcon />}
                      onClick={() => downloadFile(file)}
                      colorScheme="green"
                    />
                  </HStack>
                </VStack>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </VStack>
  )
}

export default ImageConverter