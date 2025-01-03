const sum = require('./index');

test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
});

// Baseline is 10 points for now
// Add test if we have less measurements than the baseline


const computePBC = (data) => {
    let result = {
        MOVING_RANGE: [],
        AVERAGE: [],
        AVERAGE_MOVING_RANGE: [],
        LOWER_NATURAL_PROCESS_LIMIT: []
    }

    const baselineRequestedSize = 10;

    const baselineSize = Math.min(baselineRequestedSize, data.length)

    const mathAverage = (data) => data.reduce((sum, x) => sum + x, 0) / data.length;

    const average = mathAverage(data.slice(0, baselineSize));

    for(let i = 0; i < data.length; i++) {

        result.AVERAGE.push(average);

        if(i === 0) {
            result.MOVING_RANGE.push("")
            continue
        }

        const currentValue = data[i];
        const previousValue = data[i - 1];

        result.MOVING_RANGE.push(Math.abs(currentValue - previousValue))
    }

    const averageMovingRange = mathAverage(result.MOVING_RANGE
        .slice(1, baselineSize));

    result.AVERAGE_MOVING_RANGE = new Array(data.length).fill(averageMovingRange);

    for(let i = 0; i < data.length; i++) {
        result.LOWER_NATURAL_PROCESS_LIMIT.push(Math.round((result.AVERAGE[i] - (3 * result.AVERAGE_MOVING_RANGE[i] / 1.128)) * 100) / 100)
    }


    return result
}

function transpose(obj) {
    const keys = Object.keys(obj)

    const lengths = keys.map(key => obj[key].length);
    const [firstLen, ...restLens] = lengths;
    const allSameLength = restLens.every(len => len === firstLen); //?

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

/**
 * Compute a Process Behavior Charts and list signal detections
 *
 * @param {array[number]} data The list of measurements to include in the PBC.
 * @return {array[array]} the PBC
 * @customfunction
 */
const pbc = (data) => transpose(computePBC(data.map(x => x[0])));

describe('Compute the Moving Range between two measurements', () => {
    test('have Moving Range to the result object', () => {
        const result = computePBC([]);
        expect(result).toHaveProperty('MOVING_RANGE');
    })

    test('Doesnt add value for first row', () => {
        const result = computePBC([1]);
        expect(result.MOVING_RANGE).toStrictEqual([""]);
    })

    test.each([
        {data: [0, 1], expected: ["", 1]},
        {data: [0,-1], expected: ["", 1]},
        {data: [0, 1, 0], expected: ["", 1, 1]},
        {data: [0, 1, 10, 5, 6, 3], expected: ["", 1, 9, 5, 1, 3]},
        {data: [0, 0.5,], expected: ["", 0.5]},
    ])('Value is absolute value of difference between current and previous measurements', ({data, expected}) => {
        const result = computePBC(data);
        expect(result.MOVING_RANGE).toStrictEqual(expected);

    })
    
});

describe('Compute the Average for the baseline', () => {
    test('have Average to the result object', () => {
        const result = computePBC([]);
        expect(result).toHaveProperty('AVERAGE');
    })

    test.each([
        {data: [1], expected: [1]},
        {data: [1, 1], expected: [1, 1]},
        {data: [1, 3], expected: [2, 2]},
        {data: [1, -1], expected: [0, 0]},
    ])('Average value is the average of the measurements in the baseline', ({data, expected}) => {
        const result = computePBC(data);
        expect(result.AVERAGE).toStrictEqual(expected);
    })

    test.each([
        {data: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100], expected: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]},
    ])('Average doesnt use value outside of the baseline', ({data, expected}) => {
        const result = computePBC(data);
        expect(result.AVERAGE).toStrictEqual(expected);
    })

});

describe('Compute the Average Moving Range for the baseline', () => {
    test('have Average Moving Range to the result object', () => {
        const result = computePBC([]);
        expect(result).toHaveProperty('AVERAGE_MOVING_RANGE');
    })

    test.each([
        {data: [1, 2], expected: [1, 1]},
        {data: [0, 2], expected: [2, 2]},
        {data: [0, -2], expected: [2, 2]},
        {data: [0, 2, 4], expected: [2, 2, 2]},
        {data: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10], expected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]},
        {data: [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 10], expected: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]},
    ])('Average Moving Range value is the average of the moving range between two measurements in the baseline', ({data, expected}) => {
        const result = computePBC(data);
        expect(result.AVERAGE_MOVING_RANGE).toStrictEqual(expected);
    })
});

describe('Compute the Lower Natural Process Limit to the result object', () => {

    test('have Lower Natural Process Limit to the result object', () => {
        const result = computePBC([]);
        expect(result).toHaveProperty('LOWER_NATURAL_PROCESS_LIMIT');
    })

    test.each([
        {data: [1, 1, 1, 1], expected: [1, 1, 1, 1]},
        {data: [1, 2, 1, 2], expected: [-1.16, -1.16, -1.16, -1.16]},
    ])('Compute Lower Natural Process Limit to the result object', ({data, expected}) => {
        const result = computePBC(data);
        expect(result.LOWER_NATURAL_PROCESS_LIMIT).toStrictEqual(expected);
    })

})

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
