import {
  VStack,
  Text,
  Box,
  Button,
  useColorModeValue,
  Heading,
  Icon
} from '@chakra-ui/react'
import { ExternalLinkIcon } from '@chakra-ui/icons'
import { FaFilePdf } from 'react-icons/fa'

const PDFTools = () => {
  const bgColor = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  return (
    <Box p={10} borderWidth={1} borderRadius="2xl" bg={bgColor} borderColor={borderColor} textAlign="center" boxShadow="sm">
      <VStack spacing={6}>
        <Icon as={FaFilePdf} w={20} h={20} color="red.500" />
        <VStack spacing={3}>
          <Heading size="lg">Advanced PDF Suite</Heading>
          <Text color="gray.500" maxW="lg" fontSize="lg">
            We've migrated all PDF tools to our dedicated, feature-rich PDF portal. You can now split, merge, convert, compress, and do much more over at pdf.mikey.host!
          </Text>
        </VStack>
        <Button
          as="a"
          href="https://pdf.mikey.host"
          target="_blank"
          rel="noopener noreferrer"
          colorScheme="red"
          size="lg"
          rightIcon={<ExternalLinkIcon />}
          mt={4}
          px={8}
          py={6}
          fontWeight="bold"
          borderRadius="full"
        >
          Open PDF Tools
        </Button>
      </VStack>
    </Box>
  )
}

export default PDFTools