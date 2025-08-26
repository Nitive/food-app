import React, { useEffect } from 'react'
import { Container, Loader, Text, Stack } from '@mantine/core'

export function AuthCallback() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const code = urlParams.get('code')
    const error = urlParams.get('error')

    if (error) {
      // Если есть ошибка, отправляем сообщение родительскому окну
      window.opener?.postMessage(
        { type: 'GOOGLE_AUTH_ERROR', error },
        window.location.origin
      )
      window.close()
      return
    }

    if (code) {
      // Если есть код, отправляем его родительскому окну
      window.opener?.postMessage(
        { type: 'GOOGLE_AUTH_SUCCESS', code },
        window.location.origin
      )
      window.close()
    } else {
      // Если нет кода, показываем ошибку
      window.opener?.postMessage(
        { type: 'GOOGLE_AUTH_ERROR', error: 'No authorization code received' },
        window.location.origin
      )
      window.close()
    }
  }, [])

  return (
    <Container size="xs" style={{ marginTop: '20vh' }}>
      <Stack align="center" spacing="lg">
        <Loader size="lg" />
        <Text>Обработка авторизации...</Text>
      </Stack>
    </Container>
  )
}
