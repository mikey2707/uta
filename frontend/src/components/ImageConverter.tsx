import { useState, useCallback } from 'react'
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
} from '@chakra-ui/react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { CloseIcon, DownloadIcon } from '@chakra-ui/icons'

interface ProcessedFile {
  filename: string
  url: string
}

const ImageConverter = () => {
  const [files, setFiles] = useState<File[]>([])
  const [format, setFormat] = useState('png')
  const [width, setWidth] = useState<number | null>(null)
  const [height, setHeight] = useState<number | null>(null)
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
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
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

      const response = await axios.post('http://localhost:8000/api/convert-image', formData)
      setProcessedFiles(response.data.files)
      
      toast({
        title: 'Success',
        description: 'Images converted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
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
      const response = await axios.get(`http://localhost:8000${file.url}`, {
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
            Supports PNG, JPG, JPEG, GIF, WebP
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
                />
                <Text noOfLines={1} pr={8}>{file.name}</Text>
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
                <option value="gif">GIF</option>
              </Select>
            </FormControl>

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
        <Progress
          value={progress}
          size="xs"
          colorScheme="blue"
          hasStripe
          isAnimated
        />
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
                  <HStack width="full" justify="space-between">
                    <Text noOfLines={1} flex={1}>{file.filename}</Text>
                    <IconButton
                      aria-label="Download"
                      icon={<DownloadIcon />}
                      onClick={() => downloadFile(file)}
                      colorScheme="green"
                    />
                  </HStack>
                  <Text fontSize="sm" color="gray.500">
                    Converted to: {format.toUpperCase()}
                  </Text>
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