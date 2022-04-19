import { retrace } from '../src'
import { parseMappings } from '../src/Mappings'

const MAPPINGS_SOURCE = `# This is a comment
com.example.application.ArgumentWordReader -> com.example.a.a:
    java.lang.String[] arguments -> a
    int index -> a
    36:57:void <init>(java.lang.String[],java.io.File) -> <init>
    64:64:java.lang.String nextLine() -> a
    72:72:java.lang.String lineLocationDescription() -> b
com.example.application.Main -> com.example.application.Main:
    com.example.application.Configuration configuration -> a
    50:66:void <init>(com.example.application.Configuration) -> <init>
    74:228:void execute() -> a
    2039:2056:void com.example.application.GPL.check():39:56 -> a
    2039:2056:void execute():76 -> a
    2236:2252:void printConfiguration():236:252 -> a
    2236:2252:void execute():80 -> a
    3040:3042:java.io.PrintWriter com.example.application.util.PrintWriterUtil.createPrintWriterOut(java.io.File):40:42 -> a
    3040:3042:void printConfiguration():243 -> a
    3040:3042:void execute():80 -> a
    3260:3268:void readInput():260:268 -> a
    3260:3268:void execute():97 -> a`

const STACKTRACE = `java.lang.NullPointerException: Attempt to read from field 'java.lang.String[] com.example.a.a.a' on a null object reference
    at com.example.a.a.b(SourceFile:72)
    at com.example.application.Main.<init>(SourceFile:60)`

describe('Simple', () => {
	test('parse mappings', () => {
		parseMappings(MAPPINGS_SOURCE)
	})

	test('retrace', () => {
		const result = retrace(MAPPINGS_SOURCE, STACKTRACE)
		expect(result).toBe(`java.lang.NullPointerException: Attempt to read from field 'java.lang.String[] com.example.application.ArgumentWordReader.arguments' on a null object reference
    at com.example.application.ArgumentWordReader.lineLocationDescription(ArgumentWordReader.java:72)
    at com.example.application.Main.<init>(Main.java:60)
`)
	})
})
