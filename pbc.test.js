import {
    PBC,
    computeOneProcess,
    transpose,
    rule3,
    rule2,
    rule1,
    prepareDataFromGoogleSheet, buildPBC, mrRule1
} from './index.js';

describe('Compute the data for a Process Behavior Chart with data coming from Google Sheet', () => {

    test('Directly with an array of values', () => {
        const pbcData = PBC([1, 0, 1, 0 /*baseline avg: 0.5*/, 2, 3.5 /*signal 1*/, 0 /* signal MR 1 */, 1, 1, 1, 1, 1, 1, 1, 1 /* signal 2*/, 0, 0, 1.9, 1.9, 0.2, 1.9 /*signal 3*/], [], 4);
        expect(pbcData).toMatchSnapshot();
    })

    test('With an array of array of one value', () => {
        const pbcData = PBC([[82.30], [82.6], [82.9], [82.7], [82.7], [82.3], [82.9], [82.5], [82.6], [82.4], [81.8], [81.8], [81.6], [81.3], [81.7], [81.8], [81.7], [82], [81.2], [81.4], [83.2], [82.8], [82], [81.9], [82.5], [83.2], [82.9], [81.8], [81.6], [81.8], [82.8], [81.9], [82.5], [82.2], [82], [81.3], [80.9], [81.3], [81.4]], [])

        expect(pbcData).toMatchSnapshot();
    })

    test('As same result with sub-array or without', () => {
        const pbcData1 = PBC([82.30, 82.6, 82.9, 82.7, 82.7, 82.3, 82.9, 82.5, 82.6, 82.4, 81.8, 81.8, 81.6, 81.3, 81.7, 81.8, 81.7, 82, 81.2, 81.4, 83.2, 82.8, 82, 81.9, 82.5, 83.2, 82.9, 81.8, 81.6, 81.8, 82.8, 81.9, 82.5, 82.2, 82, 81.3, 80.9, 81.3, 81.4], [])
        const pbcData2 = PBC([[82.30], [82.6], [82.9], [82.7], [82.7], [82.3], [82.9], [82.5], [82.6], [82.4], [81.8], [81.8], [81.6], [81.3], [81.7], [81.8], [81.7], [82], [81.2], [81.4], [83.2], [82.8], [82], [81.9], [82.5], [83.2], [82.9], [81.8], [81.6], [81.8], [82.8], [81.9], [82.5], [82.2], [82], [81.3], [80.9], [81.3], [81.4]], [])

        expect(pbcData1).toStrictEqual(pbcData2);
    })

    test('Allows to change the baseline size', () => {
        const pbcData = PBC([1, 2, 1], [],  2)

        expect(pbcData).toMatchSnapshot()
    })

    test('Fails if the data array is empty', () => {
        expect(() => PBC([], [], 10)).toThrowError('Data array must not be empty.')
    })

    test('Do not create rows for empty data input', () => {
        const pbcData = PBC([10, 5, 0, ''], [], 10)

        expect(pbcData.length).toBe(4)
    })

    test('Data with empty trailing inputs has same result as without them', () => {
        const pbcDataWithEmptyLines = PBC([10, 5, 0, ''], [], 10)
        const pbcDataWithoutEmptyLines = PBC([10, 5, 0], [], 10)

        expect(pbcDataWithEmptyLines).toStrictEqual(pbcDataWithoutEmptyLines)
    })
});

describe('Build a PBC', () => {

    test.each(
        [
            'Average',
            'Moving range',
            'MR Upper limit',
            'Lower limit',
            'Upper limit',
            'Rule 1',
            'Rule 2',
            'Rule 3',
            'MR Rule 1'
        ]
    )('with all the necessary columns', (columName) => {
        const pbc = buildPBC([1, 2, 3]);

        expect(pbc).toHaveProperty(columName);
    })
})

describe('Instructions', () => {

    test('Doesnt fail if the instruction parameters is missing', () => {
        const pbcData = PBC([1, 10, 2, 5, 15, -2], [], 10);
        expect(pbcData).toMatchSnapshot()
    })

    test('Doesnt fail if the instruction parameters contains less rows than the data one', () => {
        const pbcData = PBC([1, 1, 1], ['',], 10);
        expect(pbcData).toMatchSnapshot()
    })

    test('Doesnt fail if the instruction parameters contains more rows than the data one', () => {
        const pbcData = PBC([1, 1, 1], ['', '', '', ''], 10);
        expect(pbcData).toMatchSnapshot()
    })

    test('When there is more instruction rows than data rows, as same result as with same number of rowsd', () => {
        const pbcWithMoreRows = PBC([1, 1, 1], ['', '', '', ''], 10);
        const pbcWithSameNumberOfRows = PBC([1, 1, 1], ['', '', ''], 10);
        expect(pbcWithMoreRows).toStrictEqual(pbcWithSameNumberOfRows)
    })

    test('Doesnt fail if the instructions contain an unknown instruction', () => {
        const pbcData = PBC([1, 1, 1], ['', '', 'unknown instruction', ''], 10);
        expect(pbcData).toMatchSnapshot()
    })

    test('Accept instructions in array of array', () => {
        const pbcWithInstructionInArray =  PBC([1, 10, 100, 136], [[''], [''], ['Change limits'], ['']], 10)
        const pbcWithInstructionNotInArray =  PBC([1, 10, 100, 136], ['', '', 'Change limits', ''], 10)

        expect(pbcWithInstructionInArray).toStrictEqual(pbcWithInstructionNotInArray)
    })

    describe('Change limits instruction allows to split data into multiple sub-processes', () => {

        test('Using "Change limits" instruction on first line doesnt change the result', () => {
            const pbcWithoutInstruction = PBC([1, 10, 2, 5, 15, -2], [], 10)
            const pbcWithInstruction =  PBC([1, 10, 2, 5, 15, -2], ['Change limits'], 10)
            expect(pbcWithInstruction).toStrictEqual(pbcWithoutInstruction)
        })

        test('Using "Change limits" instruction split the PBC into parts that would be equal to multiple small PBCs assembled', () => {
            const pbcWithoutInstruction1 = PBC([1, 10,], [], 10)
            const pbcWithoutInstruction2 = PBC([100, 136], [], 10)
            const pbcWithInstruction =  PBC([1, 10, 100, 136], ['', '', 'Change limits', ''], 10)

            const [_headers, ...pbcWithInstruction2WithoutHeaders] = pbcWithoutInstruction2;
            expect(pbcWithInstruction).toStrictEqual([...pbcWithoutInstruction1, ...pbcWithInstruction2WithoutHeaders])
        })
    })
})

describe('Compute the Average for the baseline', () => {

    test.each([
        {data: [1], baselineSize: 1, expected: [1]},
        {data: [1, 1], baselineSize: 2, expected: [1, 1]},
        {data: [1, -1], baselineSize: 2, expected: [0, 0]},
        {data: [1, 3], baselineSize: 2 ,expected: [2, 2]},
        {data: [1, -1], baselineSize: 2, expected: [0, 0]},
        {data: [1, 3], baselineSize: 1 ,expected: [1, 1]},
        {data: [1, 3], baselineSize: 3 ,expected: [2, 2]},
    ])('Average value is the average of the measurements in the baseline', ({data,  baselineSize, expected}) => {
        const result = computeOneProcess(data, baselineSize);
        expect(result['Average']).toStrictEqual(expected);
    })

});

describe('Compute the Moving range ', () => {

    test.each([
        {data: [1], expected: ['']},
        {data: [1, 1], expected: ['', 0]},
        {data: [0, 1], expected: ['', 1]},
        {data: [0, -1], expected: ['', 1]},
        {data: [0, 1, 2, -1], expected: ['', 1, 1, 3]},
    ])('Compute the Moving Range', ({data, expected}) => {
        const result = computeOneProcess(data);
        expect(result['Moving range']).toStrictEqual(expected);
    })
})


describe('Compute the Lower Natural Process Limit to the result object', () => {

    test.each([
        {data: [1, 1, 1, 1], baselineSize: 4, expected: [1, 1, 1, 1]},
        {data: [1, 0, -1], baselineSize: 3, expected: [-2.659574468085107, -2.659574468085107, -2.659574468085107]},
        {data: [1, 2, 1, 2], baselineSize: 4, expected: [-1.1595744680851068, -1.1595744680851068, -1.1595744680851068, -1.1595744680851068]},
        {data: [0, 2, 1, 2], baselineSize: 1, expected: [0, 0, 0, 0]},
        {data: [1, 1, 2, 2], baselineSize: 2, expected: [1, 1, 1, 1]},
        {data: [-1, 1, 2, 2], baselineSize: 2, expected: [-5.319148936170214, -5.319148936170214, -5.319148936170214, -5.319148936170214]},
    ])('Compute Lower Natural Process Limit to the result object', ({data, baselineSize, expected}) => {
        const result = computeOneProcess(data, baselineSize);
        expect(result['Lower limit']).toStrictEqual(expected);
    })

})

describe('Compute the Upper Natural Process Limit to the result object', () => {

    test.each([
        {data: [1, 1, 1, 1], baselineSize: 4, expected: [1, 1, 1, 1]},
        {data: [1, 0, -1], baselineSize: 3, expected: [2.659574468085107, 2.659574468085107, 2.659574468085107]},
        {data: [1, 2, 1, 2], baselineSize: 4, expected: [4.159574468085107, 4.159574468085107, 4.159574468085107, 4.159574468085107]},
        {data: [0, 2, 1, 2], baselineSize: 1, expected: [0, 0, 0, 0]},
        {data: [1, 1, 2, 2], baselineSize: 2, expected: [1, 1, 1, 1]},
        {data: [-1, 1, 2, 2], baselineSize: 2, expected: [5.319148936170214, 5.319148936170214, 5.319148936170214, 5.319148936170214]},
    ])('Compute Upper Natural Process Limit to the result object', ({data, baselineSize, expected}) => {
        const result = computeOneProcess(data, baselineSize);
        expect(result['Upper limit']).toStrictEqual(expected);
    })

})

describe('Compute the MR Upper Limit', () => {

    test.each([
        {data: [1, 1], baselineSize: 1, expected: [0, 0]},
        {data: [1, 0], baselineSize: 2, expected: [3.268,  3.268]},
        {data: [1, -1], baselineSize: 2, expected: [6.536,  6.536]},
        {data: [-1, -1], baselineSize: 2, expected: [0, 0]},
        {data: [1, 0, 1], baselineSize: 2, expected: [3.268,  3.268, 3.268]},
        {data: [1, 1, 1], baselineSize: 2, expected: [0, 0, 0]},
        {data: [1, 1, 1], baselineSize: 3, expected: [0, 0, 0]},
        {data: [0, 10, 6], baselineSize: 3, expected: [22.875999999999998, 22.875999999999998, 22.875999999999998]},
    ])('Compute Upper Natural Process Limit to the result object', ({data, baselineSize, expected}) => {
        const result = computeOneProcess(data, baselineSize);
        expect(result['MR Upper limit']).toStrictEqual(expected);
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

describe('Rule 3 : Three out of four points closer to UNPL or LNPL than from central line', () => {

    test.each([
        {data: [], expected: []},
        {data: [1], expected: ['']},
        {data: [1, 1], expected: ['', '']},
        {data: [1, 1, 1], expected: ['', '', '']},
    ])('Doesnt detect signal for less than four points', ({data, expected}) => {
        const result = rule3(data, 0, 0, 0);
        expect(result).toStrictEqual(expected);
    })

    test.each([
        {data: [-1, 1, -1, 1], average: 0, expected: ['', '', '', '']},
    ])('Doesnt detect signal for points on either side of the average', ({data, expected}) => {
        const result = rule3(data, 0, -3, 3);
        expect(result).toStrictEqual(expected);
    })

    test.each([
        {data: [1, 1, 1, 1], average: 0, lowerLimit: -3, upperLimit: 3, expected: ['', '', '', '']},
        {data: [-1, -1, -1, -1], average: 0, lowerLimit: -3, upperLimit: 3, expected: ['', '', '', '']},
    ])('Doesnt detect signal if points are closer to the average than to one of the limits', ({data, average, lowerLimit, upperLimit, expected}) => {
        const result = rule3(data, average, lowerLimit, upperLimit);
        expect(result).toStrictEqual(expected);
    })

    test.each([
        {data: [2, 2, 2, 2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [2, 2, 2, 2]},
        {data: [-2, -2, -2, -2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [-2, -2, -2, -2]},
    ])('Detects signal if 4 points are closer to the same limit than the average', ({data, average, lowerLimit, upperLimit, expected}) => {
        const result = rule3(data, average, lowerLimit, upperLimit);
        expect(result).toStrictEqual(expected);
    })

    // Need to check that we don't count closer to the two limits
    test.each([
        {data: [2, 2, 2, 1], average: 0, lowerLimit: -3, upperLimit: 3, expected: [2, 2, 2, 1]},
        {data: [2, 2, 1, 2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [2, 2, 1, 2]},
        {data: [2, 1, 2, 2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [2, 1, 2, 2]},
        {data: [1, 2, 2, 2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [1, 2, 2, 2]},
        {data: [-2, -2, -2, -1], average: 0, lowerLimit: -3, upperLimit: 3, expected: [-2, -2, -2, -1]},
        {data: [-2, -2, -1, -2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [-2, -2, -1, -2]},
        {data: [-2, -1, -2, -2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [-2, -1, -2, -2]},
        {data: [-1, -2, -2, -2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [-1, -2, -2, -2]},
    ])('Detects signal if 3 out of 4 points are closer to the same limit than the average', ({data, average, lowerLimit, upperLimit, expected}) => {
        const result = rule3(data, average, lowerLimit, upperLimit);
        expect(result).toStrictEqual(expected);
    })

    test.each([
        {data: [1, 2, 2, 2, 1], average: 0, lowerLimit: -3, upperLimit: 3, expected: [1, 2, 2, 2, 1]},
        {data: [2, 2, 2, 2, 2, 2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [2, 2, 2, 2, 2, 2]},
        {data: [-2, -2, -2, -2, -2, -2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [-2, -2, -2, -2, -2, -2]},
        {data: [1, 2, 2, 2, 1, 2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [1, 2, 2, 2, 1, 2]},
        {data: [-1, -2, -2, -2, -1], average: 0, lowerLimit: -3, upperLimit: 3, expected: [-1, -2, -2, -2, -1]},
        {data: [-1, -2, -2, -2, -1, -2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [-1, -2, -2, -2, -1, -2]},
        {data: [1, 2, 2, 2, 1, 1, 2, 2, 2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [1, 2, 2, 2, 1, 1, 2, 2, 2]},
        {data: [-1, -2, -2, -2, -1, -1, -2, -2, -2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [-1, -2, -2, -2, -1, -1, -2, -2, -2]},
    ])('Detects multiple collocated signals if 3 out of 4 points are closer to the same limit than the average', ({data, average, lowerLimit, upperLimit, expected}) => {
        const result = rule3(data, average, lowerLimit, upperLimit);
        expect(result).toStrictEqual(expected);
    })

    test.each([
        {data: [1, 2, 2, 2, 1, 1, 1, 2, 2, 2], average: 0, lowerLimit: -3, upperLimit: 3, expected: [1, 2, 2, 2, 1, '', 1, 2, 2, 2]},
    ])('Detects multiple spaced signals', ({data, average, lowerLimit, upperLimit, expected}) => {
        const result = rule3(data, average, lowerLimit, upperLimit);
        expect(result).toStrictEqual(expected);
    })

    test.each([
        {data: [2, 2, 2, 1, 1], average: 0, lowerLimit: -3, upperLimit: 3, expected: [2, 2, 2, 1, '']},
        {data: [-2, -2, -2, -1, -1], average: 0, lowerLimit: -3, upperLimit: 3, expected: [-2, -2, -2, -1, '']},
    ])('Doesnt include points after a signal', ({data, average, lowerLimit, upperLimit, expected}) => {
        const result = rule3(data, average, lowerLimit, upperLimit);
        expect(result).toStrictEqual(expected);
    })

    test.each([
        {data: [1, 1, 2, 2, 2], average: 0, lowerLimit: -3, upperLimit: 3, expected: ['', 1, 2, 2, 2]},
        {data: [-1, -1, -2, -2, -2], average: 0, lowerLimit: -3, upperLimit: 3, expected: ['', -1, -2, -2, -2]},
    ])('Doesnt include points before a signal', ({data, average, lowerLimit, upperLimit, expected}) => {
        const result = rule3(data, average, lowerLimit, upperLimit);
        expect(result).toStrictEqual(expected);
    })
});


describe('MR Rule 1 : Any point above the MR Upper limit', () => {
    test('Doesnt detect signal if there is no data', () => {
        const result = mrRule1([], 0);
        expect(result).toStrictEqual([]);
    })

    test.each([
        {data: [1], expected: ['']},
        {data: [1, 1], expected: ['', '']},
    ])('Doesnt detect a signal below the MR Upper limit', ({data, expected}) => {
        const result = mrRule1(data, 10);
        expect(result).toStrictEqual(expected);
    })

    test.each([
        {data: [1], mrUpperLimit: 0, expected: [1]},
        {data: [1, 1], mrUpperLimit: 0, expected: [1, 1]},
        {data: [-1, 1], mrUpperLimit: 0, expected: ['', 1]},
        {data: [1, -1], mrUpperLimit: 0, expected: [1, '']},
        {data: [1, -1, 1], mrUpperLimit: 0, expected: [1, '', 1]},
        {data: [1, -1, 3], mrUpperLimit: 2, expected: ['', '', 3]},
    ])('Detect a signal when data is above the MR Upper limit', ({data, mrUpperLimit, expected}) => {
        const result = mrRule1(data, mrUpperLimit);
        expect(result).toStrictEqual(expected);
    })

    test('Doesnt detect a signal for a point equal to the MR average', () => {
        const result = mrRule1([10], 10);
        expect(result).toStrictEqual(['']);
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
