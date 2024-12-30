const sum = require('./index');

test('adds 1 + 2 to equal 3', () => {
    expect(sum(1, 2)).toBe(3);
});

const pbc = (data) => {
    const headers = ['Moving Range'];
    let result = headers;

    for(let i = 0; i < data.length; i++) {
        if(i === 0) {
            result.push("")
            continue
        }

        const currentValue = data[i];
        const previousValue = data[i - 1];

        result.push(Math.abs(currentValue - previousValue))
    }



    return result

}

describe('Compute the Moving Range between two measurements', () => {
    test('Adds the Moving Range column header', () => {
        const result = pbc([]);
        expect(result).toStrictEqual(['Moving Range']);
    })

    test('Doesnt add value for first row', () => {
        const result = pbc([1]);
        expect(result).toStrictEqual(['Moving Range', ""]);
    })

    test.each([
        {data: [0, 1], expected: ["", 1]},
        {data: [0,-1], expected: ["", 1]},
        {data: [0, 1, 0], expected: ["", 1, 1]},
    ])('Value is absolute value of difference between current and previous measurements', ({data, expected}) => {
        const result = pbc(data);
        expect(result).toStrictEqual(['Moving Range', ...expected]);

    })


});