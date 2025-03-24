"use strict";

// Класс обработки массива
class ArrayProcessror {
    static serialize(numbers) {
        const freqMap = new Map();
        for (const num of numbers) {
            if (num < 1 || num > 300) throw new Error("Неверное число: " + num);
            freqMap.set(num, (freqMap.get(num) || 0) + 1);
        }

        // Выбор метода (группировка или побитовое)
        const useGrouping = freqMap.size * 19 < numbers.length * 9;

        let bits = [useGrouping ? 1 : 0];

        if (useGrouping) {
            for (const [num, cnt] of freqMap) {
                // Число (9 бит)
                for (let i = 8; i >= 0; i--) bits.push((num >> i) & 1);

                // Количество (10 бит)
                let count = cnt;
                for (let i = 9; i >= 0; i--) bits.push((count >> i) & 1);
            }
        } else {
            for (const num of numbers) {
                for (let i = 8; i >= 0; i--) bits.push((num >> i) & 1);
            }
        }

        // Упаковка в байты
        const byteCount = Math.ceil(bits.length / 8);
        while (bits.length < byteCount * 8) bits.push(0);

        const bytes = [];
        for (let i = 0; i < bits.length; i += 8) {
            let byte = 0;
            for (let j = 0; j < 8; j++) {
                byte |= (bits[i + j] || 0) << (7 - j);
            }
            bytes.push(byte);
        }

        return this._toBase64(bytes);
    }

    // Десериализация
    static deserialize(str) {
        const bytes = this._fromBase64(str);
        let bits = [];
        for (const byte of bytes) {
            for (let i = 7; i >= 0; i--) {
                bits.push((byte >> i) & 1);
            }
        }

        const useGrouping = bits.shift();
        const result = [];

        if (useGrouping) {
            let pos = 0;
            while (pos < bits.length) {
                // Число
                let num = 0;
                for (let i = 0; i < 9; i++) {
                    if (pos >= bits.length) break;
                    num |= bits[pos++] << (8 - i);
                }

                // Количество
                let numCount = 0;
                for (let i = 0; i < 10; i++) {
                    if (pos >= bits.length) break;
                    numCount |= bits[pos++] << (9 - i);
                }

                for (let i = 0; i < numCount; i++) result.push(num);
            }
        } else {
            for (let i = 0; i < bits.length; i += 9) {
//                if (i + 9 > bits.length) break; // Только полные 9-бит блоки
                let num = 0;
                for (let j = 0; j < 9; j++) {
                    num |= bits[i + j] << (8 - j);
                }
                result.push(num);
            }
        }

        // Удаление возможных нулей в конце
        while (result.length > 0 && result[result.length - 1] === 0) {
            result.pop();
        }

        return result;
    }

    // Универсальная реализация Base64
    static _toBase64(bytes) {
        const binaryString = bytes.map(byte => String.fromCharCode(byte)).join('');
        return typeof btoa !== 'undefined'
            ? btoa(binaryString)
            : Buffer.from(binaryString, 'binary').toString('base64');
    }

    static _fromBase64(base64Str) {
        const binaryString = typeof atob !== 'undefined'
            ? atob(base64Str)
            : Buffer.from(base64Str, 'base64').toString('binary');
        return Array.from(binaryString, c => c.charCodeAt(0));
    }

}

// набор тестовых данных
const tests = [
    { testArray: [1, 1, 1, 1], descr: "4 повторения" },
    { testArray: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], descr: "Нет повторений" },
    { testArray: [3, 1, 4, 2, 5], descr: "Неупорядоченный набор" },
    { testArray: Array(100).fill(150), descr: "100 одинаковых чисел" },
    { testArray: [...Array(300)].map((_, i) => i + 1), descr: "Полный диапазон" },
    { testArray: [1, 2, 3, 4, 5], descr: "Короткий тест" },
    { testArray: Array.from({ length: 50 }, () => Math.floor(Math.random() * 300) + 1), descr: "Случайные 50 чисел" },
    { testArray: Array.from({ length: 100 }, () => Math.floor(Math.random() * 300) + 1), descr: "Случайные 100 чисел" },
    { testArray: Array.from({ length: 500 }, () => Math.floor(Math.random() * 300) + 1), descr: "Случайные 500 чисел" },
    { testArray: Array.from({ length: 1000 }, () => Math.floor(Math.random() * 300) + 1), descr: "Случайные 1000 чисел" },
    {
        testArray: Array.from({ length: 100 }, () => {
            let res = Math.floor(Math.random() * 10);
            return res == 0 ? 1 : res;
        }),
        descr: "Все числа 1 знака"
    },
    {
        testArray: Array.from({ length: 100 }, () => {
            let res = Math.floor(Math.random() * 100);
            return res == 0 ? 1 : res;
        }),
        descr: "Все числа из 2х знаков"
    },
    {
        testArray: Array.from({ length: 100 }, () => {
            let res = Math.floor(Math.random() * 1000);
            return res == 0 ? 1 : (Math.floor(res / 300) > 0 ? (res % 300 > 0 ? res % 300 : 1) : 1);
        }
        ),
        descr: "Все числа из 3х знаков"
    },
    { testArray: Array.from({ length: 900 }, (_, i) => (i % 300) + 1), descr: "Каждого числа по 3 - всего 900 чисел" }

];

// прогон тестов
tests.forEach(({ testArray, descr }) => {
    try {
        const serialized = ArrayProcessror.serialize(testArray);
        const deserialized = ArrayProcessror.deserialize(serialized);

        // Проверка множества (без учета порядка)
        const isEqual = testArray.length === deserialized.length &&
            testArray.every(n => deserialized.includes(n));

        const originalSize = JSON.stringify(testArray).length;
        const compressedSize = serialized.length;

        const compressRatio = (1 - (compressedSize / originalSize)) * 100;
        console.log(`Тест: ${descr}`);
        console.log(`Оригинал: ${JSON.stringify(testArray)}, элементов: ${testArray.length}`);
        console.log(`Сжатая строка: ${serialized}`);
        console.log(`Результат десериализации: ${JSON.stringify(deserialized)}`);
        console.log(`Сжатие: ${serialized.length} байт ${compressRatio.toFixed(1)}%`);

        console.log(`Соответствие: ${isEqual ? 'Совпало' : 'Не совпало!'}`);
        console.log('---');
    } catch (e) {
        console.error(`Ошибка в тесте "${descr}":`, e.message);
    }

});
