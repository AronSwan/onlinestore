
        describe('Memory Test', () => {
          test('should consume memory', () => {
            const bigArray = new Array(1000000).fill('test');
            expect(bigArray.length).toBe(1000000);
          });
        });
      