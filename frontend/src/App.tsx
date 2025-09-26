import {
  ChakraProvider,
  Container,
  VStack,
  Heading,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Box,
  useColorModeValue,
  Text,
  extendTheme,
  ThemeConfig,
} from '@chakra-ui/react'
import BackgroundRemover from './components/BackgroundRemover'
import ImageConverter from './components/ImageConverter'
import VideoDownloader from './components/VideoDownloader'
import PDFTools from './components/PDFTools'
import ColorModeToggle from './components/ColorModeToggle'

// Add color mode config
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
}

// Extend the theme to customize the look
const theme = extendTheme({
  config,
  styles: {
    global: (props) => ({
      'html, body, #root': {
        backgroundColor: props.colorMode === 'dark' ? 'gray.900' : 'white',
        minHeight: '100vh',
      },
    }),
  },
  components: {
    Box: {
      baseStyle: (props) => ({
        bg: props.colorMode === 'dark' ? 'gray.900' : 'white',
      }),
    },
    Container: {
      baseStyle: (props) => ({
        bg: props.colorMode === 'dark' ? 'gray.900' : 'white',
      }),
    },
    Tabs: {
      variants: {
        enclosed: (props) => ({
          root: {
            borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
          },
          tab: {
            bg: props.colorMode === 'dark' ? 'gray.700' : 'gray.100',
            color: props.colorMode === 'dark' ? 'gray.200' : 'gray.600',
            borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
            _selected: {
              bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
              color: props.colorMode === 'dark' ? 'white' : 'gray.800',
              borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
            },
            _hover: {
              bg: props.colorMode === 'dark' ? 'gray.600' : 'gray.50',
            },
          },
          tablist: {
            borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
          },
          tabpanel: {
            bg: props.colorMode === 'dark' ? 'gray.800' : 'white',
            borderColor: props.colorMode === 'dark' ? 'gray.700' : 'gray.200',
          },
        }),
      },
    },
  },
})

function App() {
  const bgColor = useColorModeValue('white', 'gray.900')
  const cardBg = useColorModeValue('gray.50', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const gradientStart = useColorModeValue('blue.400', 'blue.200')
  const gradientEnd = useColorModeValue('purple.500', 'purple.400')

  return (
    <ChakraProvider theme={theme}>
      <Box 
        as="div" 
        className="app-wrapper"
        minHeight="100vh"
        bg={bgColor}
      >
        <ColorModeToggle />
        <Container 
          maxW="container.xl" 
          py={8}
          bg={bgColor}
        >
          <VStack spacing={8} align="stretch">
            <VStack spacing={2}>
              <Heading 
                size="2xl" 
                bgGradient={`linear(to-r, ${gradientStart}, ${gradientEnd})`}
                bgClip="text"
              >
                Unified Tools
              </Heading>
              <Text 
                color={useColorModeValue('gray.600', 'gray.400')} 
                fontSize="lg"
              >
                All-in-one media processing toolkit
              </Text>
            </VStack>
            
            <Box
              bg={cardBg}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={borderColor}
              overflow="hidden"
              p={6}
              className="main-card"
            >
              <Tabs 
                isFitted 
                variant="enclosed" 
                colorScheme="blue"
                isLazy
              >
                <TabList mb="1em">
                  <Tab fontWeight="medium" py={4}>Background Remover</Tab>
                  <Tab fontWeight="medium" py={4}>Image Converter</Tab>
                  <Tab fontWeight="medium" py={4}>Video Downloader</Tab>
                  <Tab fontWeight="medium" py={4}>PDF Tools</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel px={0}>
                    <BackgroundRemover />
                  </TabPanel>
                  <TabPanel px={0}>
                    <ImageConverter />
                  </TabPanel>
                  <TabPanel px={0}>
                    <VideoDownloader />
                  </TabPanel>
                  <TabPanel px={0}>
                    <PDFTools />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          </VStack>
        </Container>
      </Box>
    </ChakraProvider>
  )
}

export default App