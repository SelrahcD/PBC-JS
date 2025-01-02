const sum = require('./index');

test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
});

const pbc = (data) => {
    let result = {
        MOVING_RANGE: [],
    }

    for(let i = 0; i < data.length; i++) {
        if(i === 0) {
            result.MOVING_RANGE.push("")
            continue
        }

        const currentValue = data[i];
        const previousValue = data[i - 1];

        result.MOVING_RANGE.push(Math.abs(currentValue - previousValue))
    }



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


});