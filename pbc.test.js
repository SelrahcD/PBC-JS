const sum = require('./index');

test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
});

// Baseline is 10 points for now


const pbc = (data) => {
    let result = {
        MOVING_RANGE: [],
        AVERAGE: [],
        AVERAGE_MOVING_RANGE: [],
    }

    const baselineRequestedSize = 10;

    const baselineSize = Math.min(baselineRequestedSize, data.length)

    const average = data.slice(0, baselineSize).reduce((a, b) => a + b, 0) / baselineSize;

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

    const averageMovingRange = result.MOVING_RANGE
        .slice(1, baselineSize)
        .reduce((a, b) => a + b, 0) / (baselineSize - 1);

    result.AVERAGE_MOVING_RANGE = new Array(data.length).fill(averageMovingRange);


    return result

}

describe('Compute the Moving Range between two measurements', () => {
    test('have Moving Range to the result object', () => {
        const result = pbc([]);
        expect(result).toHaveProperty('MOVING_RANGE');
    })

    test('Doesnt add value for first row', () => {
        const result = pbc([1]);
        expect(result.MOVING_RANGE).toStrictEqual([""]);
    })

    test.each([
        {data: [0, 1], expected: ["", 1]},
        {data: [0,-1], expected: ["", 1]},
        {data: [0, 1, 0], expected: ["", 1, 1]},
        {data: [0, 1, 10, 5, 6, 3], expected: ["", 1, 9, 5, 1, 3]},
    ])('Value is absolute value of difference between current and previous measurements', ({data, expected}) => {
        const result = pbc(data);
        expect(result.MOVING_RANGE).toStrictEqual(expected);

    })
    
});

describe('Compute the Average for the baseline', () => {
    test('have Average to the result object', () => {
        const result = pbc([]);
        expect(result).toHaveProperty('AVERAGE');
    })

    test.each([
        {data: [1], expected: [1]},
        {data: [1, 1], expected: [1, 1]},
        {data: [1, 3], expected: [2, 2]},
        {data: [1, -1], expected: [0, 0]},
    ])('Average value is the average of the measurements in the baseline', ({data, expected}) => {
        const result = pbc(data);
        expect(result.AVERAGE).toStrictEqual(expected);
    })

    test.each([
        {data: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 100], expected: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]},
    ])('Average doesnt use value outside of the baseline', ({data, expected}) => {
        const result = pbc(data);
        expect(result.AVERAGE).toStrictEqual(expected);
    })

});

describe('Compute the Average Moving Range for the baseline', () => {
    test('have Average Moving Range to the result object', () => {
        const result = pbc([]);
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
        const result = pbc(data);
        expect(result.AVERAGE_MOVING_RANGE).toStrictEqual(expected);
    })
});