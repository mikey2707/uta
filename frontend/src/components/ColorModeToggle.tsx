import { IconButton, useColorMode, useColorModeValue } from '@chakra-ui/react'
import { SunIcon, MoonIcon } from '@chakra-ui/icons'

const ColorModeToggle = () => {
  const { toggleColorMode } = useColorMode()
  const icon = useColorModeValue(<MoonIcon />, <SunIcon />)
  const buttonBg = useColorModeValue('gray.100', 'gray.700')

  return (
    <IconButton
      aria-label="Toggle color mode"
      icon={icon}
      onClick={toggleColorMode}
      position="fixed"
      top={4}
      right={4}
      size="lg"
      borderRadius="full"
      bg={buttonBg}
      _hover={{
        bg: useColorModeValue('gray.200', 'gray.600'),
      }}
      transition="all 0.2s"
    />
  )
}

export default ColorModeToggle
