import { FrameInfo } from './Frames'
import { FieldInfo, Mappings, MethodInfo } from './Mappings'

export class FrameRemapper {
	constructor(
		private readonly mappings: Mappings,
	) {}

	transform(frame: FrameInfo): FrameInfo[] | undefined {
		const deobfClassName = this.deobfClassName(frame.className)
		if (!deobfClassName) {
			return undefined
		}
		const deobfType = this.deobfType(frame.type)
		const deobfArgs = this.deobfArgs(frame.args)
		const frames: FrameInfo[] = []

		const fields = this.mappings.fieldMap.get(deobfClassName)?.get(frame.fieldName ?? '') ?? []
		for (const field of fields) {
			if (FrameRemapper.fieldMatches(field, deobfType)) {
				frames.push({
					...frame,
					className: field.className,
					fieldName: field.name,
					type: field.type,
					sourceFile: this.sourceFileName(field.className),
				})
			}
		}

		const methods = this.mappings.methodMap.get(deobfClassName)?.get(frame.methodName ?? '') ?? []
		for (const method of methods) {
			// console.log('Try to match method', method, frame.lineNumber, deobfType, deobfArgs, '->', FrameRemapper.methodMatches(method, frame.lineNumber, deobfType, deobfArgs))
			if (FrameRemapper.methodMatches(method, frame.lineNumber, deobfType, deobfArgs)) {
				let lineNumber = frame.lineNumber
				if (method.deobfFirstLine !== method.firstLine) {
					lineNumber = method.deobfLastLine && method.deobfLastLine !== method.deobfLastLine && lineNumber
						? method.deobfFirstLine - method.firstLine
						: method.deobfFirstLine
				}
				frames.push({
					...frame,
					className: method.className,
					methodName: method.name,
					type: method.type,
					args: method.args,
					lineNumber,
					sourceFile: this.sourceFileName(method.className), 
				})
			}
		}

		if (frames.length === 0) {
			frames.push({
				...frame,
				className: deobfClassName,
				sourceFile: this.sourceFileName(deobfClassName),
			})
		}

		// console.log('Transform', frame, '->', frames)

		return frames
	}

	deobfClassName(className?: string) {
		if (!className) return undefined
		return this.mappings.classMap.get(className) ?? className
	}

	deobfType(type?: string) {
		if (!type) return undefined
		const index = type?.indexOf('[')
		return index >= 0
			? this.deobfClassName(type.substring(0, index)) + type.substring(index)
			: this.deobfClassName(type)
	}

	deobfArgs(args?: string) {
		if (!args) return undefined
		return args // TODO
	}

	sourceFileName(className: string) {
		const index1 = className.lastIndexOf('.') + 1
		const index2 = className.indexOf('$', index1)
		return (index2 >= 0
			? className.substring(index1, index2)
			: className.substring(index1)) + '.java'
	}

	static fieldMatches(field: FieldInfo, type: string | undefined) {
		return type === undefined || field.type === type
	}

	static methodMatches(method: MethodInfo, line: number | undefined, type: string | undefined, args: string | undefined) {
		if (line && method.firstLine && method.lastLine) {
			if (method.firstLine > line || line < method.lastLine) return false
		}
		if (type && method.type !== type) return false
		if (args && method.args !== args) return false
		return true
	}
}
