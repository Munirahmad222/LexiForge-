      // 3. Vision API (Improved Multi-language support)
      if (url.pathname === '/api/vision' && request.method === 'POST') {
        const body = await request.json();
        
        if (!body.imageBase64) {
          throw new Error("No image data provided");
        }

        // Processing image with a specific instruction for language
        const response = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
          prompt: `Instruction: Answer the user's question about the image in the same language they are using (like Urdu, Roman Urdu, or Hindi). 
                   User Question: ${body.prompt || "Describe this image"}`,
          image: [...Uint8Array.from(atob(body.imageBase64), c => c.charCodeAt(0))]
        });

        const result = response.description || response.response || "Analysis complete.";

        return new Response(JSON.stringify({ output: result }), {
          headers: { 'Content-Type': 'application/json', ...CORS }
        });
      }
