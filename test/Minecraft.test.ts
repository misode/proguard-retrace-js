import { readFile, writeFile } from 'fs/promises'
import fetch from 'node-fetch'
import { retrace } from '../src'
import { parseMappings } from '../src/Mappings'

const MINECRAFT_MAPPINGS_URL = 'https://launcher.mojang.com/v1/objects/fef172812fc00b4e2238df3f15501d19cac225fc/server.txt'
const CACHE_FILE = './test/mappings_server_1.18-pre1.local'

let VANILLA_MAPPINGS = ''

beforeAll(async () => {
	try {
		VANILLA_MAPPINGS = await readFile(CACHE_FILE, 'utf-8')
	} catch (e) {
		const response = await fetch(MINECRAFT_MAPPINGS_URL)
		VANILLA_MAPPINGS = await response.text()
		await writeFile(CACHE_FILE, Buffer.from(VANILLA_MAPPINGS, 'utf-8'))
	}
})

describe('Minecraft', () => {
	test('parse mappings', () => {
		parseMappings(VANILLA_MAPPINGS)
	})

	test('retrace', () => {
		const result = retrace(VANILLA_MAPPINGS, `java.lang.IllegalStateException: Tried to biome check an unregistered feature
    at dda.c(SourceFile:27)
    at java.base/java.util.Optional.orElseThrow(Optional.java:403)
    at dda.a(SourceFile:27)
    at ddo.a_(SourceFile:11)
    at ddm.a(SourceFile:49)`)

		expect(result).toBe(`java.lang.IllegalStateException: Tried to biome check an unregistered feature
    at net.minecraft.world.level.levelgen.placement.BiomeFilter.lambda$shouldPlace$1(BiomeFilter.java:27)
    at java.base/java.util.Optional.orElseThrow(Optional.java:403)
    at net.minecraft.world.level.levelgen.placement.BiomeFilter.biome(BiomeFilter.java:27)
    at net.minecraft.world.level.levelgen.placement.PlacementFilter.a_(PlacementFilter.java:11)
    at net.minecraft.world.level.levelgen.placement.PlacedFeature.place(PlacedFeature.java:49)
                                                                  lambda$placeWithContext$3(PlacedFeature.java:49)
                                                                  lambda$static$2(PlacedFeature.java:49)
                                                                  lambda$static$1(PlacedFeature.java:49)
`)
	})
})
