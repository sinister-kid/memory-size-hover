import * as os from 'os';
import * as vscode from 'vscode';

export interface TypeInfo {
    x32: { size: number; alignment: number };
    x64: { size: number; alignment: number };
    desc?: string;
}

type ArchitectureMode = 'auto' | 'x32' | 'x64' | 'target';

export class TypeInfoProvider {
    private static instance: TypeInfoProvider;
    private architecture: string;
    private is64Bit: boolean;

    private constructor() {
        this.architecture = os.arch();
        this.is64Bit = this.architecture.includes('64');
        this.refreshArchitecture();
    }

    public static getInstance(): TypeInfoProvider {
        if (!TypeInfoProvider.instance) {
            TypeInfoProvider.instance = new TypeInfoProvider();
        }
        return TypeInfoProvider.instance;
    }

    public getArchitecture(): string {
        return this.architecture;
    }

    public is64BitArch(): boolean {
        return this.is64Bit;
    }

    public refreshArchitecture(): void {
        const resolved = this.resolveArchitecture();
        this.architecture = resolved.arch;
        this.is64Bit = resolved.is64Bit;
    }

    public getTypeInfo(type: string): TypeInfo | null {

        const normalizedType = type.trim().toLowerCase().replace(/\s+/g, ' ');

        const typeInfo: { [key: string]: TypeInfo } = {
            // Basic integer types
            'char': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Character type, always 1 byte' },
            'signed char': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Signed character (-128 to 127)' },
            'unsigned char': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Unsigned character (0 to 255)' },

            // Short integers
            'short': { x32: {size: 2, alignment: 2}, x64: {size: 2, alignment: 2}, desc: 'Short integer, typically 16-bit' },
            'short int': { x32: {size: 2, alignment: 2}, x64: {size: 2, alignment: 2}, desc: 'Short integer, typically 16-bit' },
            'unsigned short': { x32: {size: 2, alignment: 2}, x64: {size: 2, alignment: 2}, desc: 'Unsigned short integer' },
            'unsigned short int': { x32: {size: 2, alignment: 2}, x64: {size: 2, alignment: 2}, desc: 'Unsigned short integer' },

            // Standard integers
            'int': { x32: {size: 4, alignment: 4}, x64: {size: 4, alignment: 4}, desc: 'Standard integer, typically 32-bit' },
            'signed': { x32: {size: 4, alignment: 4}, x64: {size: 4, alignment: 4}, desc: 'Signed integer (same as int)' },
            'signed int': { x32: {size: 4, alignment: 4}, x64: {size: 4, alignment: 4}, desc: 'Signed integer, typically 32-bit' },
            'unsigned': { x32: {size: 4, alignment: 4}, x64: {size: 4, alignment: 4}, desc: 'Unsigned integer' },
            'unsigned int': { x32: {size: 4, alignment: 4}, x64: {size: 4, alignment: 4}, desc: 'Unsigned integer, typically 32-bit' },

            // Long integers (platform dependent)
            'long': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Long integer (platform dependent)' },
            'long int': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Long integer (platform dependent)' },
            'signed long': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Signed long integer' },
            'signed long int': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Signed long integer' },
            'unsigned long': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Unsigned long integer' },
            'unsigned long int': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Unsigned long integer' },

            // Long long integers
            'long long': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Long long integer, always 64-bit' },
            'long long int': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Long long integer, always 64-bit' },
            'signed long long': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Signed long long integer' },
            'signed long long int': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Signed long long integer' },
            'unsigned long long': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Unsigned long long integer' },
            'unsigned long long int': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Unsigned long long integer' },

            // Floating point types
            'float': { x32: {size: 4, alignment: 4}, x64: {size: 4, alignment: 4}, desc: 'Single precision floating point (IEEE 754)' },
            'double': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Double precision floating point (IEEE 754)' },
            'long double': { x32: {size: 12, alignment: 4}, x64: {size: 16, alignment: 16}, desc: 'Extended precision floating point' },

            // Boolean and wide character
            'bool': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Boolean type (C++)' },
            '_Bool': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Boolean type (C99)' },
            'wchar_t': { x32: {size: 2, alignment: 2}, x64: {size: 4, alignment: 4}, desc: 'Wide character type' },

            // System types
            'size_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Size type for array indexing' },
            'ssize_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Signed size type' },
            'ptrdiff_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Pointer difference type' },
            'intptr_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Integer type for storing pointers' },
            'uintptr_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Unsigned integer type for storing pointers' },
            'off_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'File offset type' },
            'time_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Time type' },

            // Fixed-width integer types (C99/C++11)
            'int8_t': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Exactly 8-bit signed integer' },
            'uint8_t': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Exactly 8-bit unsigned integer' },
            'int16_t': { x32: {size: 2, alignment: 2}, x64: {size: 2, alignment: 2}, desc: 'Exactly 16-bit signed integer' },
            'uint16_t': { x32: {size: 2, alignment: 2}, x64: {size: 2, alignment: 2}, desc: 'Exactly 16-bit unsigned integer' },
            'int32_t': { x32: {size: 4, alignment: 4}, x64: {size: 4, alignment: 4}, desc: 'Exactly 32-bit signed integer' },
            'uint32_t': { x32: {size: 4, alignment: 4}, x64: {size: 4, alignment: 4}, desc: 'Exactly 32-bit unsigned integer' },
            'int64_t': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Exactly 64-bit signed integer' },
            'uint64_t': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Exactly 64-bit unsigned integer' },

            // Fast and least types
            'int_fast8_t': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Fastest type with at least 8 bits' },
            'uint_fast8_t': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Fastest unsigned type with at least 8 bits' },
            'int_fast16_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Fastest type with at least 16 bits' },
            'uint_fast16_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Fastest unsigned type with at least 16 bits' },
            'int_fast32_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Fastest type with at least 32 bits' },
            'uint_fast32_t': { x32: {size: 4, alignment: 4}, x64: {size: 8, alignment: 8}, desc: 'Fastest unsigned type with at least 32 bits' },
            'int_fast64_t': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Fastest type with at least 64 bits' },
            'uint_fast64_t': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Fastest unsigned type with at least 64 bits' },

            'int_least8_t': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Smallest type with at least 8 bits' },
            'uint_least8_t': { x32: {size: 1, alignment: 1}, x64: {size: 1, alignment: 1}, desc: 'Smallest unsigned type with at least 8 bits' },
            'int_least16_t': { x32: {size: 2, alignment: 2}, x64: {size: 2, alignment: 2}, desc: 'Smallest type with at least 16 bits' },
            'uint_least16_t': { x32: {size: 2, alignment: 2}, x64: {size: 2, alignment: 2}, desc: 'Smallest unsigned type with at least 16 bits' },
            'int_least32_t': { x32: {size: 4, alignment: 4}, x64: {size: 4, alignment: 4}, desc: 'Smallest type with at least 32 bits' },
            'uint_least32_t': { x32: {size: 4, alignment: 4}, x64: {size: 4, alignment: 4}, desc: 'Smallest unsigned type with at least 32 bits' },
            'int_least64_t': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Smallest type with at least 64 bits' },
            'uint_least64_t': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Smallest unsigned type with at least 64 bits' },

            // Maximum width types
            'intmax_t': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Maximum width signed integer' },
            'uintmax_t': { x32: {size: 8, alignment: 8}, x64: {size: 8, alignment: 8}, desc: 'Maximum width unsigned integer' }
        };

        return typeInfo[normalizedType] || null;
    }

    public getMemorySize(type: string): number | null {
        const info = this.getTypeInfo(type);
        if (!info) return null;
        return this.is64Bit ? info.x64.size : info.x32.size;
    }

    public getAlignment(type: string): number | null {
        const info = this.getTypeInfo(type);
        if (!info) return null;
        return this.is64Bit ? info.x64.alignment : info.x32.alignment;
    }

    public getPointerSize(): number {
        return this.is64Bit ? 8 : 4;
    }

    private resolveArchitecture(): { is64Bit: boolean; arch: string } {
        const config = vscode.workspace.getConfiguration('memorySizeHover');
        const mode = config.get<ArchitectureMode>('architecture', 'auto');
        const hostArch = os.arch();
        const hostIs64 = hostArch.includes('64');

        if (mode === 'x32') {
            return { is64Bit: false, arch: 'x32 (manual)' };
        }

        if (mode === 'x64') {
            return { is64Bit: true, arch: 'x64 (manual)' };
        }

        if (mode === 'target') {
            const targetArch = this.detectTargetArchitecture();
            if (targetArch) {
                return targetArch;
            }
            return {
                is64Bit: hostIs64,
                arch: `${hostArch} (target unavailable, host fallback)`
            };
        }

        return {
            is64Bit: hostIs64,
            arch: `${hostArch} (host)`
        };
    }

    private detectTargetArchitecture(): { is64Bit: boolean; arch: string } | null {
        const cppConfig = vscode.workspace.getConfiguration('C_Cpp');
        const mode = cppConfig.get<string>('default.intelliSenseMode', '').toLowerCase();

        if (!mode) {
            return null;
        }

        if (mode.includes('x64') || mode.includes('amd64') || mode.includes('arm64') || mode.includes('aarch64')) {
            return { is64Bit: true, arch: `x64 (target: ${mode})` };
        }

        if (mode.includes('x86') || mode.includes('i386') || mode.includes('i686') || mode.includes('arm') || mode.includes('32')) {
            return { is64Bit: false, arch: `x32 (target: ${mode})` };
        }

        return null;
    }
}
