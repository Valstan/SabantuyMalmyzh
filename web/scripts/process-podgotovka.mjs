import sharp from 'sharp'
import path from 'path'
const SRC = 'D:/valstan/Скачано с интернета/111111'
const DST = 'src/seed/assets/podgotovka'
const MAP = [
  ['dgR64B4ZpMtIYqcV3BTjse1QVrLw1G8YijXkIW2amOT0y5ZHvMw8zaEsqKV0k0bVYbndIWEafLfgmMhEGmaiDtrE.jpg', 'podgotovka-01-vorota.jpg'],
  ['Vpcp4vIYwOt4vE-Y7hwcTHy8Hws9Mu6pgBXbsH3gX-dCXa9uoS03bt7MjLM6WVp9b0Y_Zp7GtCFHrWeXsIlEGd4k.jpg', 'podgotovka-02-zabor.jpg'],
  ['MeRO9i0d9WR7M7gj8NKg4WtNMI8E1587xvFUV6X5BDdHQYmD0CjyIYOeQtjekp_pIGgY6UdwrHQldxsn2FD00zHb.jpg', 'podgotovka-03-kryltso.jpg'],
  ['hki0a9JBETEvrAWjG6sQNUNsB6MBbKR-8exiQ2UVO9ajY-EBQmcX6P05miRs9EUWBrYDiM665FPBOQvKFnFNSYnW.jpg', 'podgotovka-04-karkas.jpg'],
  ['zm7ZYUQZ9OYX7i3mO_EkP6RRnIbjzFMjrpU1r6DSM2wj0pmGEQtT_qom1naw5NKcgWSDDou_yCodEcEc4eDgY0Lj.jpg', 'podgotovka-05-domiki.jpg'],
  ['G2R1NguGkUHPxpjd-PGR3YFWBJR_JJBxqT2RvX88AAJ6U3mxddxT_TVFlWQC2FOXccIuDDiHc5BV4l10DoqD89vi.jpg', 'podgotovka-06-maydan.jpg'],
  ['mcqBIqdH3aqwImiIrc3W3JkKkWtWYmOXjtA2TtrF9QcNWVGVUPaX11aBJODXTZLfOu3Poe-OLp2uocrPxPRlqZP9.jpg', 'podgotovka-07-scena.jpg'],
  ['9JlXn0rMOLQIuQ87CRHlWkUNs19eHoEEAXfXvpf1q49JzcdJCS_drBcbXYhVkfR-0PQZlM01DgXq55zlXWu4Hw6X.jpg', 'podgotovka-08-repetitsiya.jpg'],
]
for (const [src, dst] of MAP) {
  await sharp(path.join(SRC, src)).rotate().resize(1920, 1920, {fit:'inside', withoutEnlargement:true}).jpeg({quality:80, mozjpeg:true}).toFile(path.join(DST, dst))
  console.log('✓', dst)
}
