const cloudBaseFolders: {
  [key: string]: string
} = {
  events: 'EcZaQ7ewHyNlvpPD3QfrGq0OL',
  messages: 'ok8FbILcjAkwdJHRuknXcjLqf',
  users: 'zzuTR21v7WeLLn9xHQhY2D6Mu'
}
const cloudFolders: {
  [key: string]: string
} = {
  event_images: `${cloudBaseFolders.events}/50KKtFPjsj505zHoxs5S3eDW6ShJegl6FYLyRGdjNZeXY3wnSN`,
  event_videos: `${cloudBaseFolders.events}/o9oqzSpHg6XyQvPNxVJ2p6DBcmiceGoup9N4HloMlJgJi5ilKy`,
  event_attachments: `${cloudBaseFolders.events}/WU0Geb2lfQb1YnyPQQy9YCy5nTasvVIZ1bZA4DuNebrZ7pfPSr`,
  event_requisites: `${cloudBaseFolders.events}/D1a8an3Jti4gXHsVUJAX5QNAJqScTqilmKTP1mBe1BCxSiMQWu`,
  message_attachments: `${cloudBaseFolders.messages}/eRzhfrXdG3wWXIcN7r0Dr62Ksd061XMBji99RZECeSlf0BSqdp`,
  group_images: `${cloudBaseFolders.messages}/JxBe7En6K44XIJ5uRQ2CzrvdLix8BTZaQZoJwy9pOfqAB1IoWD`,
  profile_videos: `${cloudBaseFolders.users}/cSxb5bnoHuIdvRKMr6EAM3hShfBuTWbot6OnKn4pXYQ2u2QQzs`,
  profile_images: `${cloudBaseFolders.users}/pRAJbu5293Jrk1H9Zvzckcn9QVWwyS0xdZ5SojZ0aIvQZ2wPZa`,
  profile_files: `${cloudBaseFolders.users}/g9BfPZQfwSIuIlILKsi5L7RpJVTDNkhcu0nb1r3U5jTbUgDiqJ`,
  recruiter_logos: `${cloudBaseFolders.users}/aEKbZBKK1mJZ8ekQuio2XLKoh3aAXJkKxDAMP58B5kcYDSmsEk`
}

export {
  cloudBaseFolders,
  cloudFolders
}
