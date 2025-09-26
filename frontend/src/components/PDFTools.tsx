import React, { useEffect } from 'react'
import { VStack, Text, Button, useColorModeValue } from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'

const PDFTools = () => {
  const handleRedirect = () => {
    window.open('https://pdf.mikey.host', '_blank')
  }

  const bgColor = useColorModeValue('gray.50', 'gray.700')
  const borderColor = useColorModeValue('gray.200', 'gray.600')

  return (
    <VStack
      spacing={6}
      p={8}
      borderWidth={1}
      borderRadius="lg"
      borderColor={borderColor}
      bg={bgColor}
      align="center"
      justify="center"
      minH="300px"
    >
      <Text fontSize="xl" fontWeight="medium" textAlign="center">
        PDF Tools are available at our dedicated website
      </Text>
      <Button
        rightIcon={<ExternalLinkIcon />}
        colorScheme="blue"
        size="lg"
        onClick={handleRedirect}
      >
        Open PDF Tools
      </Button>
      <Text color="gray.500" fontSize="sm" textAlign="center">
        You will be redirected to pdf.mikey.host
      </Text>
    </VStack>
  )
}

export default PDFTools