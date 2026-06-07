import {
  ChakraProvider,
  Container,
  VStack,
  Heading,
  Tab,
  TabList,
  Tabs,
  Box,
  useColorModeValue,
  Text,
  extendTheme,
  ThemeConfig,
  useColorMode,
} from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
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

// Extend the theme for fonts or other subtle things, but remove rigid component overrides
const theme = extendTheme({
  config,
  styles: {
    global: {
      'html, body': {
        // We let index.css mesh classes handle the background now
        background: 'transparent',
      },
    },
  },
})

// Create a motion component for the tab panels
const MotionBox = motion(Box)

function AppContent() {
  const { colorMode } = useColorMode()
  const [tabIndex, setTabIndex] = useState(0)
  
  // Glassmorphism variables
  const glassBg = useColorModeValue('rgba(255, 255, 255, 0.75)', 'rgba(15, 23, 42, 0.75)')
  const glassBorder = useColorModeValue('rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.08)')
  const textShadowColor = useColorModeValue('rgba(255,255,255,0.8)', 'rgba(0,0,0,0.8)')
  
  const gradientStart = useColorModeValue('blue.500', 'blue.300')
  const gradientEnd = useColorModeValue('purple.500', 'purple.300')

  return (
    <Box 
      as="div" 
      className={`app-wrapper ${colorMode === 'dark' ? 'mesh-bg-dark' : 'mesh-bg-light'}`}
    >
      <ColorModeToggle />
      <Container 
        maxW="container.xl" 
        py={12}
        position="relative"
      >
        <VStack spacing={10} align="stretch">
          <VStack spacing={3} textAlign="center">
            <Heading 
              size="3xl" 
              fontWeight="extrabold"
              bgGradient={`linear(to-r, ${gradientStart}, ${gradientEnd})`}
              bgClip="text"
              letterSpacing="tight"
              style={{ filter: `drop-shadow(0px 2px 10px ${textShadowColor})` }}
            >
              Unified Tools
            </Heading>
            <Text 
              color={useColorModeValue('gray.700', 'gray.300')} 
              fontSize="xl"
              fontWeight="medium"
              style={{ textShadow: `0 2px 10px ${textShadowColor}` }}
            >
              Your all-in-one media processing toolkit
            </Text>
          </VStack>
          
          <Box
            className="main-card"
            bg={glassBg}
            backdropFilter="blur(24px)"
            borderRadius="3xl"
            borderWidth="1px"
            borderColor={glassBorder}
            boxShadow={colorMode === 'dark' ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)' : '0 25px 50px -12px rgba(0, 0, 0, 0.15)'}
            overflow="hidden"
            p={{ base: 4, md: 8 }}
          >
            <Tabs 
              index={tabIndex}
              onChange={(index) => setTabIndex(index)}
              isFitted={false}
              align="center"
              variant="soft-rounded" 
              colorScheme="blue"
              isLazy
            >
              <TabList mb={8} gap={2} flexWrap="wrap" justifyContent="center">
                <Tab fontWeight="bold" px={6} py={3} borderRadius="full" transition="all 0.2s">Background Remover</Tab>
                <Tab fontWeight="bold" px={6} py={3} borderRadius="full" transition="all 0.2s">Image Converter</Tab>
                <Tab fontWeight="bold" px={6} py={3} borderRadius="full" transition="all 0.2s">Video Downloader</Tab>
                <Tab fontWeight="bold" px={6} py={3} borderRadius="full" transition="all 0.2s">PDF Tools</Tab>
              </TabList>

              <Box position="relative" minH="500px">
                <AnimatePresence mode="wait">
                  <MotionBox
                    key={tabIndex}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {tabIndex === 0 && <BackgroundRemover />}
                    {tabIndex === 1 && <ImageConverter />}
                    {tabIndex === 2 && <VideoDownloader />}
                    {tabIndex === 3 && <PDFTools />}
                  </MotionBox>
                </AnimatePresence>
              </Box>
            </Tabs>
          </Box>
        </VStack>
      </Container>
    </Box>
  )
}

function App() {
  return (
    <ChakraProvider theme={theme}>
      <AppContent />
    </ChakraProvider>
  )
}

export default App