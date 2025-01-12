const sum = require('./index');

test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
});

// Baseline is 10 points for now
// Add test if we have less measurements than the baseline
// Add test at an higher level with a full working example

const average = (data) => {

    if(data.length === 0) return 0;

    return data.reduce((sum, x) => sum + x, 0) / data.length
};

function rule1(data, lowerLimit, upperLimit) {
    const signals = [];

    for (let i = 0; i < data.length; i++) {
        if (data[i] > upperLimit || data[i] < lowerLimit) {
            signals.push(data[i])
        } else {
            signals.push("");
        }
    }
    return signals;
}

// This could probably be achieved with recursion.
// Would probably be nicer.
function rule2(data, average) {
    let signals = [];
    let seqCount = 0;
    let prevAboveOrUnder = data[0] > average ? 'above' : 'under';
    let aboveOrUnder = '';
    let i;

    function addElementsStartingFrom(data, signals, i, seqCount) {
        for (let j = i - seqCount; j < i; j++) {
            if (seqCount >= 8) {
                signals.push(data[j]);
            } else {
                signals.push('');
            }
        }

        return signals;
    }

    for (i = 0; i < data.length; i++) {

        aboveOrUnder = data[i] > average ? 'above' : 'under';

        if (prevAboveOrUnder !== aboveOrUnder) {
            signals = addElementsStartingFrom(data, signals, i, seqCount);

            seqCount = 1;
        } else {
            seqCount++;
        }

        prevAboveOrUnder = aboveOrUnder;
    }

    return addElementsStartingFrom(data, signals, i, seqCount);
}

const emptyPBC = () => {
    return {
        AVERAGE: [],
        LOWER_NATURAL_PROCESS_LIMIT: [],
        UPPER_NATURAL_PROCESS_LIMIT: [],
        RULE_1: [],
        RULE_2: [],
    }
}

const computeOneProcess = (data) => {

    if(data.length === 0) throw new Error('Data array must not be empty.');

    let result = emptyPBC()

    const baselineRequestedSize = 10;

    const baselineSize = Math.min(baselineRequestedSize, data.length)
    const baseline = data.slice(0, baselineSize);

    const movingRange = [];

    for(let i = 1; i < baseline.length; i++) {
        let currentValue = baseline[i];
        let previousValue = baseline[i - 1];
        movingRange.push(Math.abs(currentValue - previousValue))
    }
    const averageMovingRange = average(movingRange);

    const processAverage = average(baseline);
    result.AVERAGE = new Array(data.length).fill(processAverage);

    const lowerLimit = result.AVERAGE[0] - (3 * averageMovingRange / 1.128);
    result.LOWER_NATURAL_PROCESS_LIMIT = new Array(data.length).fill(lowerLimit);

    const upperLimit = result.AVERAGE[0] + (3 * averageMovingRange / 1.128);
    result.UPPER_NATURAL_PROCESS_LIMIT = new Array(data.length).fill(upperLimit);

    result.RULE_1 = rule1(data, lowerLimit, upperLimit);
    result.RULE_2 = rule2(data, processAverage);

    return result
}

function transpose(obj) {
    const keys = Object.keys(obj)

    const lengths = keys.map(key => obj[key].length);
    const [firstLen, ...restLens] = lengths;
    const allSameLength = restLens.every(len => len === firstLen);

    if (!allSameLength) {
        throw new Error('All columns must be of same length.');
    }

    const length = obj[keys[0]].length

    const result = [keys]

    for (let i = 0; i < length; i++) {
        const row = keys.map(key => obj[key][i])
        result.push(row)
    }

    return result
}

function prepareDataFromGoogleSheet(data) {
    return data.map(x => {
        return x instanceof Array ? x[0] : x;
    }).filter(x => x !== '');
}

function mergeProcesses(process1, process2) {
    const mergedProcesses = {};

    for (const key in process1) {
        mergedProcesses[key] = process1[key].concat(process2[key]);
    }

    return mergedProcesses;
}

/**
 * Compute a Process Behavior Charts and list signal detections
 *
 * @param {array[number]} data The list of measurements to include in the PBC.
 * @param {array} instructions Instructions to change the PBC computation
 * @return {array[array]} the PBC
 * @customfunction
 */
const pbc = (data, instructions = []) =>  {

    const cleanData = prepareDataFromGoogleSheet(data);
    const cleanInstructions = prepareDataFromGoogleSheet(instructions);

    const processes = [];

    let currentProcess = [];
    for (let i = 0; i < data.length; i++) {
        if(instructions[i] === 'Change limits' && i > 0) {
            processes.push(currentProcess);
            currentProcess = [];
        }
        currentProcess.push(cleanData[i]);
    }
    processes.push(currentProcess);

    const globalPBC = processes
        .map((data) => computeOneProcess(data))
        .reduce(mergeProcesses, emptyPBC())

    return transpose(globalPBC)
}

describe('Compute the data for a Process Behavior Chart', () => {

    test('Directly with an array of values', () => {
        const pbcData = pbc([82.30, 82.6, 82.9, 82.7, 82.7, 82.3, 82.9, 82.5, 82.6, 82.4, 81.8, 81.8, 81.6, 81.3, 81.7, 81.8, 81.7, 82, 81.2, 81.4, 83.2, 82.8, 82, 81.9, 82.5, 83.2, 82.9, 81.8, 81.6, 81.8, 82.8, 81.9, 82.5, 82.2, 82, 81.3, 80.9, 81.3, 81.4])

        expect(pbcData).toMatchSnapshot();
    })

    test('With an array of array of one value', () => {
        const pbcData = pbc([[82.30], [82.6], [82.9], [82.7], [82.7], [82.3], [82.9], [82.5], [82.6], [82.4], [81.8], [81.8], [81.6], [81.3], [81.7], [81.8], [81.7], [82], [81.2], [81.4], [83.2], [82.8], [82], [81.9], [82.5], [83.2], [82.9], [81.8], [81.6], [81.8], [82.8], [81.9], [82.5], [82.2], [82], [81.3], [80.9], [81.3], [81.4]])

        expect(pbcData).toMatchSnapshot();
    })

    test('As same result with sub-array or without', () => {
        const pbcData1 = pbc([82.30, 82.6, 82.9, 82.7, 82.7, 82.3, 82.9, 82.5, 82.6, 82.4, 81.8, 81.8, 81.6, 81.3, 81.7, 81.8, 81.7, 82, 81.2, 81.4, 83.2, 82.8, 82, 81.9, 82.5, 83.2, 82.9, 81.8, 81.6, 81.8, 82.8, 81.9, 82.5, 82.2, 82, 81.3, 80.9, 81.3, 81.4])
        const pbcData2 = pbc([[82.30], [82.6], [82.9], [82.7], [82.7], [82.3], [82.9], [82.5], [82.6], [82.4], [81.8], [81.8], [81.6], [81.3], [81.7], [81.8], [81.7], [82], [81.2], [81.4], [83.2], [82.8], [82], [81.9], [82.5], [83.2], [82.9], [81.8], [81.6], [81.8], [82.8], [81.9], [82.5], [82.2], [82], [81.3], [80.9], [81.3], [81.4]])

        expect(pbcData1).toStrictEqual(pbcData2);
    })

    test('Fails if the data array is empty', () => {
        expect(() => pbc([])).toThrowError('Data array must not be empty.')
    })


    describe('Allows to compute different process using "Change limits" instruction', () => {
        test('Doesnt fail if the instruction parameters is missing', () => {
            const pbcData = pbc([1, 10, 2, 5, 15, -2]);
            expect(pbcData).toMatchSnapshot()
        })

        test('Doesnt fail if the instruction parameters contains more rows than the data one', () => {
            const pbcData = pbc([1, 1, 1], ['', '', '']);
            expect(pbcData).toMatchSnapshot()
        })

        test('Doesnt fail if the instructions contain something else than "Change limits"', () => {
            const pbcData = pbc([1, 1, 1], ['', '', 'something else', '']);
            expect(pbcData).toMatchSnapshot()
        })

        test('Doesnt fail if the instruction parameters contains less rows than the data one', () => {
            const pbcData = pbc([1, 1, 1], ['',]);
            expect(pbcData).toMatchSnapshot()
        })

        test('Using "Change limits" instruction on first line doesnt change the result', () => {
            const pbcWithoutInstruction = pbc([1, 10, 2, 5, 15, -2])
            const pbcWithInstruction =  pbc([1, 10, 2, 5, 15, -2], ['Change limits'])
            expect(pbcWithInstruction).toStrictEqual(pbcWithoutInstruction)
        })

        test('Using "Change limits" instruction split the PBC into parts that would be equal to multiple small PBCs assembled', () => {
            const pbcWithoutInstruction1 = pbc([1, 10,])
            const pbcWithoutInstruction2 = pbc([100, 136])
            const pbcWithInstruction =  pbc([1, 10, 100, 136], ['', '', 'Change limits', ''])

            const [headers, ...pbcWithInstruction2WithoutHeaders] = pbcWithoutInstruction2;
            expect(pbcWithInstruction).toStrictEqual([...pbcWithoutInstruction1, ...pbcWithInstruction2WithoutHeaders])
        })
    })
});

describe('Compute the Average for the baseline', () => {

    test.each([
        {data: [1], expected: [1]},
        {data: [1, 1], expected: [1, 1]},
        {data: [1, -1], expected: [0, 0]},
        {data: [1, 3], expected: [2, 2]},
        {data: [1, -1], expected: [0, 0]},
    ])('Average value is the average of the measurements in the baseline', ({data, expected}) => {
        const result = computeOneProcess(data);
        expect(result.AVERAGE).toStrictEqual(expected);
    })

    test.each([
        {data: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100], expected: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]},
    ])('Average doesnt use value outside of the baseline', ({data, expected}) => {
        const result = computeOneProcess(data);
        expect(result.AVERAGE).toStrictEqual(expected);
    })

});

describe('Compute the Lower Natural Process Limit to the result object', () => {

    test.each([
        {data: [1, 1, 1, 1], expected: [1, 1, 1, 1]},
        {data: [1, 0, -1], expected: [-2.659574468085107, -2.659574468085107, -2.659574468085107]},
        {data: [1, 2, 1, 2], expected: [-1.1595744680851068, -1.1595744680851068, -1.1595744680851068, -1.1595744680851068]},
    ])('Compute Lower Natural Process Limit to the result object', ({data, expected}) => {
        const result = computeOneProcess(data);
        expect(result.LOWER_NATURAL_PROCESS_LIMIT).toStrictEqual(expected);
    })

})

describe('Compute the Upper Natural Process Limit to the result object', () => {

    test.each([
        {data: [1, 1, 1, 1], expected: [1, 1, 1, 1]},
        {data: [1, 0, -1], expected: [2.659574468085107, 2.659574468085107, 2.659574468085107]},
        {data: [1, 2, 1, 2], expected: [4.159574468085107, 4.159574468085107, 4.159574468085107, 4.159574468085107]},
    ])('Compute Upper Natural Process Limit to the result object', ({data, expected}) => {
        const result = computeOneProcess(data);
        expect(result.UPPER_NATURAL_PROCESS_LIMIT).toStrictEqual(expected);
    })

})


describe('Rule 1 : One point above the UNPL or one point below the LNPL', () => {

    test('Doesnt detect a point that is inside the limits', () => {
        const result = rule1([1, 2, 1, 2], 0, 3);

        expect(result).toStrictEqual(['', '', '', '',]);
    })

    test('Detects a point that is above the UNPL', () => {
        const result = rule1([1, 4, 1, 2], 0, 3);
        expect(result).toStrictEqual(['', 4, '', '']);
    })

    test('Detects a point that is below the LNPL', () => {
        const result = rule1([1, -1, 1, 2], 0, 3);
        expect(result).toStrictEqual(['', -1, '', '']);
    })

    test('Doesnt detect a point that is equal to the LNPL', () => {
        const result = rule1([1, -1, 1, 2], -1, 3);
        expect(result).toStrictEqual(['', '', '', '']);
    })

    test('Doesnt detect a point that is equal to the UNPL', () => {
        const result = rule1([1, 2, 3, 2], 0, 3);
        expect(result).toStrictEqual(['', '', '', '']);
    })

})

describe('Rule 2 : Eight consecutive points on the same side of the central line.', () => {

    test('Doesnt detect a rule 2 signal in a group of less than 8 points', () => {
        const result = rule2([1, 3, 1, 3, 1, 3, 1], 2);

        expect(result).toStrictEqual(['', '', '', '', '', '', '']);
    })

    test.each([
        {data: [1, 3, 1, 3, 1, 3, 1, 3]},
        {data: [1, 1, 1, 1, 1, 1, 1, 3]},
        {data: [3, 3, 3, 3, 3, 3, 3, 1]},
        {data: [1, 3, 3, 3, 3, 3, 3, 3]},
        {data: [3, 3, 3, 1, 3, 3, 3, 3]},
    ])('Doesnt detect a rule 2 signal in a group of 8 points going above and under the average', ({data}) => {
        const result = rule2(data, 2);

        expect(result).toStrictEqual(['', '', '', '', '', '', '', '']);
    })

    test.each([
        {data: [3, 3, 3, 3, 3, 3, 3, 3]},
        {data: [1, 1, 1, 1, 1, 1, 1, 1]},
    ])('Detects a rule 2 signal in a group of 8 points all above and under the average', ({data}) => {
        const result = rule2(data, 2);

        expect(result).toStrictEqual(data);
    })

    test.each([
        {data: [3, 3, 3, 3, 3, 3, 3, 3, 3]},
        {data: [1, 1, 1, 1, 1, 1, 1, 1, 1]},
    ])('Detects a rule 2 signal in a group of more than 8 points all above and under the average', ({data}) => {
        const result = rule2(data, 2);

        expect(result).toStrictEqual(data);
    })

    test.each([
        {data: [1, 3, 3, 3, 3, 3, 3, 3, 3], expected: ['', 3, 3, 3, 3, 3, 3, 3, 3]},
        {data: [3, 1, 1, 1, 1, 1, 1, 1, 1], expected: ['', 1, 1, 1, 1, 1, 1, 1, 1]},
    ])('Doesnt detect measurement before a rule 2 signal as being part it', ({data, expected}) => {
        const result = rule2(data, 2);

        expect(result).toStrictEqual(expected);
    })

    test.each([
        {data: [3, 3, 3, 3, 3, 3, 3, 3, 1], expected: [3, 3, 3, 3, 3, 3, 3, 3, '']},
        {data: [1, 1, 1, 1, 1, 1, 1, 1, 3], expected: [1, 1, 1, 1, 1, 1, 1, 1, '']},
    ])('Doesnt detect measurement after a rule 2 signal as being part it', ({data, expected}) => {
        const result = rule2(data, 2);

        expect(result).toStrictEqual(expected);
    })

    test.each([
        {data: [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1], average: 2, expected: [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1]},
        {data: [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1], average: 2, expected: [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1]},
        {data: [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3], average: 2, expected: [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3]},
        {data: [3, 3, 3, 3, 3, 3, 3, 3, 1, 3, 1, 1, 1, 1, 1, 1, 1, 1], average: 2, expected: [3, 3, 3, 3, 3, 3, 3, 3, '', '', 1, 1, 1, 1, 1, 1, 1, 1]},
        {data: [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3], average: 2, expected: [3, 3, 3, 3, 3, 3, 3, 3, '', '', '', 3, 3, 3, 3, 3, 3, 3, 3]},
        {data: [82.30, 82.60, 82.90, 82.70, 82.70, 82.30, 82.90, 82.50, 82.60, 82.40, 81.80, 81.80, 81.60, 81.30, 81.70, 81.80, 81.70, 82.00, 81.20, 81.40, 83.20, 82.80, 82.00, 81.90, 82.50, 83.20, 82.90, 81.80, 81.60,], average: 82.16, expected: [82.30, 82.60, 82.90, 82.70, 82.70, 82.30, 82.90, 82.50, 82.60, 82.40, 81.80, 81.80, 81.60, 81.30, 81.70, 81.80, 81.70, 82.00, 81.20, 81.40, '', '', '', '', '', '', '', '', '',]},
    ])('Detects multiple rule 2 signal', ({data, average, expected}) => {
        const result = rule2(data, average);

        expect(result).toStrictEqual(expected);
    })

});


describe('transpose', () => {
    test('Transpose object fields to two dimensions array', () => {
        const obj = {
            a: ['A_1', 'A_2', 'A_3'],
            b: ['B_1', 'B_2', 'B_3'],
        }

        expect(transpose(obj)).toStrictEqual([
            ['a', 'b'],
            ['A_1', 'B_1'],
            ['A_2', 'B_2'],
            ['A_3', 'B_3']
        ]);
    })

    test('Fails if the length of all columns is not the same', () => {
        const obj = {
            a: ['A_1',],
            b: [],
        }

        expect(() => transpose(obj)).toThrowError('All columns must be of same length.')
    })
});


describe('prepare data from Google Sheet', () => {

    test('Transforms data as array of array to a simple array', () => {
        const preparedData = prepareDataFromGoogleSheet([['A'], ['B'], ['C'], ['D']]);
        expect(preparedData).toStrictEqual(['A', 'B', 'C', 'D']);
    })

    test('Keeps data as a simple array as it is', () => {
        expect(prepareDataFromGoogleSheet(['A', 'B', 'C', 'D'])).toStrictEqual(['A', 'B', 'C', 'D']);
    })

    test.
    each([
        {data: ['A', 'B', 'C', ''], expected: ['A', 'B', 'C']},
        {data: [['A'], ['B'], ['C'], ['']], expected: ['A', 'B', 'C']},
        {data: ['A', '', 'C'], expected: ['A', 'C']},
        {data: [['A'], [''], ['C']], expected: ['A', 'C']},
    ])
    ('Remove empty values', ({data, expected}) => {
        const preparedData = prepareDataFromGoogleSheet(data);
        expect(preparedData).toStrictEqual(expected);
    })
});
