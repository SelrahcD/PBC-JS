const sum = require('./index');

test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
});

// Baseline is 10 points for now
// Add test if we have less measurements than the baseline

const average = (data) => data.reduce((sum, x) => sum + x, 0) / data.length;

const computePBC = (data) => {
    let result = {
        AVERAGE: [],
        LOWER_NATURAL_PROCESS_LIMIT: [],
        UPPER_NATURAL_PROCESS_LIMIT: [],
    }

    const baselineRequestedSize = 10;

    const baselineSize = Math.min(baselineRequestedSize, data.length)

    const baseline = data.slice(0, baselineSize);

    const processAverage = average(baseline);

    const movingRange = [];

    for(let i = 1; i < baselineSize; i++) {
        const currentValue = data[i];
        const previousValue = data[i - 1];

        movingRange.push(Math.abs(currentValue - previousValue))
    }

    const averageMovingRange = average(movingRange);

    result.AVERAGE = new Array(data.length).fill(processAverage);

    const lowerLimit = result.AVERAGE[0] - (3 * averageMovingRange / 1.128);
    const upperLimit = result.AVERAGE[0] + (3 * averageMovingRange / 1.128);

    result.LOWER_NATURAL_PROCESS_LIMIT = new Array(data.length).fill(lowerLimit);
    result.UPPER_NATURAL_PROCESS_LIMIT = new Array(data.length).fill(upperLimit);

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

describe('Compute the Lower Natural Process Limit to the result object', () => {

    test('have Lower Natural Process Limit to the result object', () => {
        const result = computePBC([]);
        expect(result).toHaveProperty('LOWER_NATURAL_PROCESS_LIMIT');
    })

    test.each([
        {data: [1, 1, 1, 1], expected: [1, 1, 1, 1]},
        {data: [1, 2, 1, 2], expected: [-1.1595744680851068, -1.1595744680851068, -1.1595744680851068, -1.1595744680851068]},
    ])('Compute Lower Natural Process Limit to the result object', ({data, expected}) => {
        const result = computePBC(data);
        expect(result.LOWER_NATURAL_PROCESS_LIMIT).toStrictEqual(expected);
    })

})

describe('Compute the Upper Natural Process Limit to the result object', () => {

    test('have Lower Natural Process Limit to the result object', () => {
        const result = computePBC([]);
        expect(result).toHaveProperty('UPPER_NATURAL_PROCESS_LIMIT');
    })

    test.each([
        {data: [1, 1, 1, 1], expected: [1, 1, 1, 1]},
        {data: [1, 2, 1, 2], expected: [4.159574468085107, 4.159574468085107, 4.159574468085107, 4.159574468085107]},
    ])('Compute Upper Natural Process Limit to the result object', ({data, expected}) => {
        const result = computePBC(data);
        expect(result.UPPER_NATURAL_PROCESS_LIMIT).toStrictEqual(expected);
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
