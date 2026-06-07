import React, { useState, useCallback, useEffect } from 'react'
import {
  Button,
  VStack,
  Text,
  Box,
  useToast,
  Progress,
  SimpleGrid,
  Image,
  IconButton,
  HStack,
  useColorModeValue,
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

const BackgroundRemover = () => {
  const [files, setFiles] = useState<File[]>([])
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)
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
      'image/*': ['.png', '.jpg', '.jpeg']
    },
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleRemoveBackground = async () => {
    if (files.length === 0) return

    setIsLoading(true)
    setProgress(0)
    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      const response = await axios.post(`${API_URL}/api/remove-background`, formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setProgress(percentCompleted)
          }
        }
      })
      
      if (!response.data || !response.data.files) {
        throw new Error('Invalid response format')
      }

      setProcessedFiles(response.data.files)
      
      toast({
        title: 'Success',
        description: 'Background removed successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      console.error('Background removal error:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove background',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      setProcessedFiles([])  // Reset on error
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
      
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
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
            Supports PNG, JPG, JPEG
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
          <Button
            colorScheme="blue"
            mt={4}
            onClick={handleRemoveBackground}
            isLoading={isLoading}
            width="full"
          >
            Remove Background from {files.length} {files.length === 1 ? 'Image' : 'Images'}
          </Button>
        </Box>
      )}

      {isLoading && (
        <Box borderWidth={1} borderRadius="lg" p={4} bg={boxBg}>
          <VStack spacing={2}>
            <Text fontWeight="medium">Processing Images...</Text>
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

      {processedFiles && processedFiles.length > 0 && (
        <Box>
          <Text fontWeight="medium" mb={2}>Processed Images:</Text>
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
                    h="200px"
                    w="full"
                    objectFit="contain"
                    borderRadius="md"
                    sx={{
                      backgroundImage: 'repeating-linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%, #ccc), repeating-linear-gradient(45deg, #ccc 25%, #fff 25%, #fff 75%, #ccc 75%, #ccc)',
                      backgroundPosition: '0 0, 10px 10px',
                      backgroundSize: '20px 20px',
                    }}
                  />
                  <HStack width="full" justify="space-between">
                    <Text noOfLines={1} flex={1}>{file.filename}</Text>
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

export default BackgroundRemover