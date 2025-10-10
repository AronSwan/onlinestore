
        describe('Async Test', () => {
          test('should handle async operations', async () => {
            const result = await Promise.resolve(42);
            expect(result).toBe(42);
          });
        });
      