const average = (data) => {

    if(data.length === 0) return 0;

    return data.reduce((sum, x) => sum + x, 0) / data.length
};

const rule1 = (data, lowerLimit, upperLimit) => data.map(value => (value > upperLimit || value < lowerLimit) ? value : '')

const rule2 = (data, average) => createGroupsOfSize(8)(data)
    .filter(groupsWherePointsAreAllAboveOrBelowTheAverage(average))
    .reduce(addSignalGroupTo, createResultArrayOfLength(data.length))

const rule3 = (data, average, lowerLimit, upperLimit) => createGroupsOfSize(4)(data)
    .filter(groupsWith3OutOf4pointsCloserToALimitThanTheAverage(average, lowerLimit, upperLimit))
    .reduce(addSignalGroupTo, createResultArrayOfLength(data.length))

const createGroupsOfSize = (groupeSize) => (data) => {
    const groups = [];

    for (let i = 0; i <= data.length - groupeSize; i++) {
        groups.push({index: i, elements: data.slice(i, i + groupeSize)});
    }
    return groups;
};

const addSignalGroupTo = (result, {index, elements}) => {

    for (let i = 0; i < elements.length; i++) {
        result[index + i] = elements[i];
    }

    return result
};

const createResultArrayOfLength = length => new Array(length).fill('');

const groupsWherePointsAreAllAboveOrBelowTheAverage = (average) => ({elements}) => {
    let pointsAboveAverage = 0;
    let pointsBelowAverage = 0;
    for (let i = 0; i < elements.length; i++) {
        if(elements[i] > average) {
            pointsAboveAverage++;
        }
        else if(elements[i] < average) {
            pointsBelowAverage++;
        }
    }

    return pointsAboveAverage === elements.length || pointsBelowAverage === elements.length;
};


const groupsWith3OutOf4pointsCloserToALimitThanTheAverage = (average, lowerLimit, upperLimit) => {

    const upperQuarter = (average + upperLimit) / 2
    const lowerQuarter = (average + lowerLimit) / 2

    return ({elements}) => {

        let countCloserToUpperLimit = 0;
        let countCloserToLowerLimit = 0;

        for (let i = 0; i < elements.length; i++) {
            if (elements[i] > upperQuarter) {
                countCloserToUpperLimit++
            } else if (elements[i] < lowerQuarter) {
                countCloserToLowerLimit++
            }
        }

        return countCloserToUpperLimit >= 3 || countCloserToLowerLimit >= 3;
    };
}


const emptyPBC = () => {
    return {
        AVERAGE: [],
        LOWER_NATURAL_PROCESS_LIMIT: [],
        UPPER_NATURAL_PROCESS_LIMIT: [],
        RULE_1: [],
        RULE_2: [],
        RULE_3: [],
    }
}

const computeOneProcess = (data, baselineRequestedSize) => {

    if(data.length === 0) throw new Error('Data array must not be empty.');

    let result = {}

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
    result.RULE_3 = rule3(data, processAverage, lowerLimit, upperLimit);

    return result
}

const transpose = (obj)=> {
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

const prepareDataFromGoogleSheet = (data) => {
    return data.map(x => {
        return x instanceof Array ? x[0] : x;
    }).filter(x => x !== '');
}

const prepareInstructionsFromGoogleSheet = (data) => {
    return data.map(x => {
        return x instanceof Array ? x[0] : x;
    });
}

const mergeProcesses = (process1, process2) => {
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
 * @param baselineSize int The number of points to include in the baseline
 * @return {array[array]} the PBC
 * @customfunction
 */
const pbc = (data, instructions = [], baselineSize = 10) =>  {

    const cleanData = prepareDataFromGoogleSheet(data);
    const cleanInstructions = prepareInstructionsFromGoogleSheet(instructions)

    const processes = [];

    let currentProcess = [];
    for (let i = 0; i < cleanData.length; i++) {
        if(cleanInstructions[i] === 'Change limits' && i > 0) {
            processes.push(currentProcess);
            currentProcess = [];
        }
        currentProcess.push(cleanData[i]);
    }
    processes.push(currentProcess);

    const globalPBC = processes
        .map((p) => computeOneProcess(p, baselineSize))
        .reduce(mergeProcesses, emptyPBC())

    return transpose(globalPBC)
}

describe('Compute the data for a Process Behavior Chart', () => {

    test('Directly with an array of values', () => {
        const pbcData = pbc([82.30, 82.6, 82.9, 82.7, 82.7, 82.3, 82.9, 82.5, 82.6, 82.4, 81.8, 81.8, 81.6, 81.3, 81.7, 81.8, 81.7, 82, 81.2, 81.4, 83.2, 82.8, 82, 81.9, 82.5, 83.2, 82.9, 81.8, 81.6, 81.8, 82.8, 81.9, 82.5, 82.2, 82, 81.3, 80.9, 81.3, 81.4], [])

        expect(pbcData).toMatchSnapshot();
    })

    test('With an array of array of one value', () => {
        const pbcData = pbc([[82.30], [82.6], [82.9], [82.7], [82.7], [82.3], [82.9], [82.5], [82.6], [82.4], [81.8], [81.8], [81.6], [81.3], [81.7], [81.8], [81.7], [82], [81.2], [81.4], [83.2], [82.8], [82], [81.9], [82.5], [83.2], [82.9], [81.8], [81.6], [81.8], [82.8], [81.9], [82.5], [82.2], [82], [81.3], [80.9], [81.3], [81.4]], [])

        expect(pbcData).toMatchSnapshot();
    })

    test('As same result with sub-array or without', () => {
        const pbcData1 = pbc([82.30, 82.6, 82.9, 82.7, 82.7, 82.3, 82.9, 82.5, 82.6, 82.4, 81.8, 81.8, 81.6, 81.3, 81.7, 81.8, 81.7, 82, 81.2, 81.4, 83.2, 82.8, 82, 81.9, 82.5, 83.2, 82.9, 81.8, 81.6, 81.8, 82.8, 81.9, 82.5, 82.2, 82, 81.3, 80.9, 81.3, 81.4], [])
        const pbcData2 = pbc([[82.30], [82.6], [82.9], [82.7], [82.7], [82.3], [82.9], [82.5], [82.6], [82.4], [81.8], [81.8], [81.6], [81.3], [81.7], [81.8], [81.7], [82], [81.2], [81.4], [83.2], [82.8], [82], [81.9], [82.5], [83.2], [82.9], [81.8], [81.6], [81.8], [82.8], [81.9], [82.5], [82.2], [82], [81.3], [80.9], [81.3], [81.4]], [])

        expect(pbcData1).toStrictEqual(pbcData2);
    })

    test('Allows to change the baseline size', () => {
        const pbcData = pbc([1, 2, 1], [],  2)

        expect(pbcData).toMatchSnapshot()
    })

    test('Fails if the data array is empty', () => {
        expect(() => pbc([], [], 10)).toThrowError('Data array must not be empty.')
    })

    test('Do not create rows for empty data input', () => {
        const pbcData = pbc([10, 5, 0, ''], [], 10)

        expect(pbcData.length).toBe(4)
    })

    test('Data with empty trailing inputs has same result as without them', () => {
        const pbcDataWithEmptyLines = pbc([10, 5, 0, ''], [], 10)
        const pbcDataWithoutEmptyLines = pbc([10, 5, 0], [], 10)

        expect(pbcDataWithEmptyLines).toStrictEqual(pbcDataWithoutEmptyLines)
    })
});


describe('Instructions', () => {

    test('Doesnt fail if the instruction parameters is missing', () => {
        const pbcData = pbc([1, 10, 2, 5, 15, -2], [], 10);
        expect(pbcData).toMatchSnapshot()
    })

    test('Doesnt fail if the instruction parameters contains less rows than the data one', () => {
        const pbcData = pbc([1, 1, 1], ['',], 10);
        expect(pbcData).toMatchSnapshot()
    })

    test('Doesnt fail if the instruction parameters contains more rows than the data one', () => {
        const pbcData = pbc([1, 1, 1], ['', '', '', ''], 10);
        expect(pbcData).toMatchSnapshot()
    })

    test('When there is more instruction rows than data rows, as same result as with same number of rowsd', () => {
        const pbcWithMoreRows = pbc([1, 1, 1], ['', '', '', ''], 10);
        const pbcWithSameNumberOfRows = pbc([1, 1, 1], ['', '', ''], 10);
        expect(pbcWithMoreRows).toStrictEqual(pbcWithSameNumberOfRows)
    })

    test('Doesnt fail if the instructions contain an unknown instruction', () => {
        const pbcData = pbc([1, 1, 1], ['', '', 'unknown instruction', ''], 10);
        expect(pbcData).toMatchSnapshot()
    })

    test('Accept instructions in array of array', () => {
        const pbcWithInstructionInArray =  pbc([1, 10, 100, 136], [[''], [''], ['Change limits'], ['']], 10)
        const pbcWithInstructionNotInArray =  pbc([1, 10, 100, 136], ['', '', 'Change limits', ''], 10)

        expect(pbcWithInstructionInArray).toStrictEqual(pbcWithInstructionNotInArray)
    })

    describe('Change limits instruction allows to split data into multiple sub-processes', () => {

        test('Using "Change limits" instruction on first line doesnt change the result', () => {
            const pbcWithoutInstruction = pbc([1, 10, 2, 5, 15, -2], [], 10)
            const pbcWithInstruction =  pbc([1, 10, 2, 5, 15, -2], ['Change limits'], 10)
            expect(pbcWithInstruction).toStrictEqual(pbcWithoutInstruction)
        })

        test('Using "Change limits" instruction split the PBC into parts that would be equal to multiple small PBCs assembled', () => {
            const pbcWithoutInstruction1 = pbc([1, 10,], [], 10)
            const pbcWithoutInstruction2 = pbc([100, 136], [], 10)
            const pbcWithInstruction =  pbc([1, 10, 100, 136], ['', '', 'Change limits', ''], 10)

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
        expect(result.AVERAGE).toStrictEqual(expected);
    })

});

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
        expect(result.LOWER_NATURAL_PROCESS_LIMIT).toStrictEqual(expected);
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
